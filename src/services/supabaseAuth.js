import supabase, { isSupabaseReady } from "./supabase";
import { getAlumniByEmail } from "./alumniQueries";
import {
  deleteSecureItem,
  getSecureItem,
  saveSecureItem,
} from "./secureStorage";

// 👇 IMPORT FROM CONFIG INSTEAD OF USING PROCESS.ENV
import { LARAVEL_API_BASE_URL, MOBILE_API_TOKEN } from "./config";

const laravelHeaders = (extra = {}) => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-App-Token": MOBILE_API_TOKEN,
  ...extra,
});

export const getLaravelHeaders = async (extra = {}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return laravelHeaders({
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
    ...extra,
  });
};

export const laravelApi = {
  baseUrl: LARAVEL_API_BASE_URL,
  headers: laravelHeaders,
};

/**
 * Supabase Authentication Service
 * Handles all authentication operations using Supabase Auth
 */

let currentUser = null;
let authStateListeners = [];

const getAlumniByEmailInternal = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  try {
    return await getAlumniByEmail(normalizedEmail);

  } catch (err) {
    console.error("[supabaseAuth] getAlumniByEmailInternal exception:", err.message || err);
    return null;
  }
};

const resolveCurrentAlumniFromSession = async (session) => {
  const authEmail = session?.user?.email;
  // if (__DEV__) console.log('[supabaseAuth] Resolving alumni from session for email:', authEmail);

  if (!authEmail) {
    console.warn("[supabaseAuth] No email in session user");
    return null;
  }

  try {
    const alumni = await getAlumniByEmailInternal(authEmail);
    if (!alumni) {
      console.warn(
        "[supabaseAuth] No alumni profile found for email:",
        authEmail,
      );
      return null;
    }

    // if (__DEV__) console.log('[supabaseAuth] Alumni resolved:', alumni.id);
    return {
      ...alumni,
      auth_user_id: session?.user?.id || null,
    };
  } catch (err) {
    console.error(
      "[supabaseAuth] Failed to resolve alumni:",
      err.message || err,
    );
    return null;
  }
};

/**
 * Initialize auth state listener
 */
export const initializeAuthStateListener = () => {
  if (!isSupabaseReady()) {
    console.error("[supabaseAuth] Supabase not initialized");
    return;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      try {
        currentUser = await resolveCurrentAlumniFromSession(session);
      } catch (err) {
        currentUser = null;
        console.error(
          "[supabaseAuth] Failed to resolve alumni profile on sign in:",
          err?.message || err,
        );
      }
      // Store session locally
      if (session.refresh_token) {
        await saveSecureItem("supabaseRefreshToken", session.refresh_token);
      }
      // if (__DEV__) console.log('[supabaseAuth] User signed in:', currentUser?.id || session.user.id);
    } else if (event === "SIGNED_OUT") {
      currentUser = null;
      await deleteSecureItem("supabaseRefreshToken");
      // if (__DEV__) console.log('[supabaseAuth] User signed out');
    }

    // Notify all listeners
    authStateListeners.forEach((listener) =>
      listener({ user: currentUser, session }),
    );
  });

  return subscription;
};

/**
 * Add listener for auth state changes
 */
export const addAuthStateListener = (listener) => {
  authStateListeners.push(listener);
  return () => {
    authStateListeners = authStateListeners.filter((l) => l !== listener);
  };
};

/**
 * Sign up a new user
 */
export const signUpUser = async (email, password, userData) => {
  if (!isSupabaseReady()) {
    throw new Error("Supabase not initialized");
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) throw error;

    // if (__DEV__) console.log('[supabaseAuth] User signed up:', data.user?.id);
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error("[supabaseAuth] Sign up error:", error.message);
    throw error;
  }
};

/**
 * Sign in user with email and password
 */
export const signInUser = async (email, password) => {
  if (!isSupabaseReady()) {
    const msg =
      "Supabase not initialized - check env vars EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY";
    console.error("[supabaseAuth]", msg);
    throw new Error(msg);
  }

  try {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    // if (__DEV__) console.log('[supabaseAuth] Attempting sign in for:', normalizedEmail);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const errMsg = error?.message || "";
      if (errMsg.includes("Invalid login credentials")) {
        if (__DEV__)
          console.warn(
            "[supabaseAuth] Invalid login credentials for provided account",
          );
      } else {
        console.error("[supabaseAuth] Sign in error - error object:", error);
      }
      throw error;
    }

    const alumniProfile = await getAlumniByEmailInternal(normalizedEmail);
    currentUser = alumniProfile
      ? { ...alumniProfile, auth_user_id: data.user?.id || null }
      : null;

    // Store refresh token for persistence
    if (data.session?.refresh_token) {
      await saveSecureItem("supabaseRefreshToken", data.session.refresh_token);
    }

    // if (__DEV__) console.log('[supabaseAuth] User signed in:', currentUser?.id || data.user?.id);
    return { user: currentUser, session: data.session };
  } catch (error) {
    const errMsg = error?.message || "";
    if (errMsg.includes("Invalid login credentials")) {
      if (__DEV__)
        console.warn("[supabaseAuth] Sign in rejected: invalid credentials");
    } else {
      console.error("[supabaseAuth] Sign in error:", error.message || error);
    }
    throw error;
  }
};

// Utility: Sign out
// Also resets the alumni's presence flags before ending the session,
// so nothing is left stale in the DB if the app is force-closed later.
export const signOutUser = async () => {
  if (!supabase) throw new Error("Supabase not initialized");

  // 1. Read the current session BEFORE signing out — after signOut()
  //    getUser() returns null and we won't know which row to update.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = String(user?.email || "").trim().toLowerCase();
    const alumni = currentUser || (email ? await getAlumniByEmail(email) : null);

    // 2. Flip the presence flags while we still know who we are.
    if (alumni?.id) {
      await supabase
        .from("alumnis_base")
        .update({
          is_online: false,
          push_token: null,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", alumni.id);
    }
  } catch (err) {
    // Non-fatal: if this fails (network, RLS, etc.), we still sign out.
    // Otherwise the user would be stuck logged in.
    console.warn("[signOutUser] Failed to reset presence flags:", err);
  }

  // 3. End the session. Even if step 2 failed, we still want to log out.
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get current user
 * Uses getSession first to check if there's an active session (safer than getUser)
 */
export const getCurrentUser = async () => {
  if (!isSupabaseReady()) {
    return null;
  }

  try {
    // First check if there's a session at all
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("[supabaseAuth] Session check error:", sessionError.message);
      return null;
    }

    // If no session, return null (no error to log - this is expected for logged-out users)
    if (!session) {
      return null;
    }

    const alumni = await resolveCurrentAlumniFromSession(session);
    currentUser = alumni;
    return alumni;
  } catch (error) {
    console.error("[supabaseAuth] Get current user error:", error.message);
    return null;
  }
};

/**
 * Get cached current user (synchronous)
 */
export const getCachedUser = () => currentUser;

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  if (!isSupabaseReady()) {
    return null;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;

    return session;
  } catch (error) {
    console.error("[supabaseAuth] Get session error:", error.message);
    return null;
  }
};

/**
 * Refresh session using stored refresh token
 */
export const refreshSession = async () => {
  if (!isSupabaseReady()) {
    throw new Error("Supabase not initialized");
  }

  try {
    const refreshToken = await getSecureItem("supabaseRefreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token found");
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) throw error;

    if (data.session?.refresh_token) {
      await SecureStore.setItemAsync(
        "supabaseRefreshToken",
        data.session.refresh_token,
      );
    }

    currentUser = await resolveCurrentAlumniFromSession(data.session);
    return { user: currentUser, session: data.session };
  } catch (error) {
    console.error("[supabaseAuth] Refresh session error:", error.message);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email) => {
  if (!isSupabaseReady()) {
    throw new Error("Supabase not initialized");
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "app://reset-password",
    });

    if (error) throw error;

    // if (__DEV__) console.log('[supabaseAuth] Password reset email sent');
  } catch (error) {
    console.error("[supabaseAuth] Reset password error:", error.message);
    throw error;
  }
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword) => {
  if (!isSupabaseReady()) {
    throw new Error("Supabase not initialized");
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    // if (__DEV__) console.log('[supabaseAuth] Password updated');
  } catch (error) {
    console.error("[supabaseAuth] Update password error:", error.message);
    throw error;
  }
};

/**
 * Check if user is authenticated
 */
export const isUserAuthenticated = () => {
  return currentUser !== null;
};

/**
 * Get user ID (synchronous)
 */
export const getUserId = () => currentUser?.id || null;

/**
 * Get user email (synchronous)
 */
export const getUserEmail = () => currentUser?.email || null;
