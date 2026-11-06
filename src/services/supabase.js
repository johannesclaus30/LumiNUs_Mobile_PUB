// CRITICAL: Import URL polyfill BEFORE Supabase client creation
// This ensures fetch/URL APIs work properly in React Native
import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import { diagnoseEnvironment, verifySupabaseClient } from "./envDiagnostics";
import { secureStorage } from "./secureStorage";

// Load environment variables from .env file
// process.env is populated by Expo from .env file at build time
// If not available, use hardcoded fallback values
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://pmnirrvwibzqjlutbnwz.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbmlycnZ3aWJ6cWpsdXRibnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI0MzAwNDgsImV4cCI6MTkwODY5NzA0OH0.WoJBaLWvQy_0nMKLe4hVTvWJVLNQUKIHxfSZGFVQZEY";

// Log env var loading for debugging
if (__DEV__) {
  // console.log('[supabase] Initializing Supabase client...');
  // console.log('[supabase] URL loaded:', Boolean(SUPABASE_URL));
  // console.log('[supabase] Key loaded:', Boolean(SUPABASE_ANON_KEY));
  // diagnoseEnvironment();
}

// Validate environment variables
if (!SUPABASE_URL) {
  console.error(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL environment variable",
  );
}

if (!SUPABASE_ANON_KEY) {
  console.error(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable",
  );
}

// Initialize Supabase client
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })
    : null;

if (supabase) {
  if (__DEV__) {
    // console.log('[supabase] ✓ Client initialized successfully');
    // console.log('[supabase] URL:', SUPABASE_URL);
  }
} else {
  console.error("[supabase] ✗ Failed to initialize - missing credentials");
}

// Utility: Check if supabase is ready
export const isSupabaseReady = () => supabase !== null;

// Utility: Get current session
export const getCurrentSession = async () => {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

// Utility: Get current user
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

// Utility: Sign out
export const signOutUser = async () => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export default supabase;
