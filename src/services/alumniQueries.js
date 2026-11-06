import supabase from "./supabase";
import { decode } from "base64-arraybuffer";
import CryptoJS from "crypto-js";
import { LARAVEL_API_BASE_URL, MOBILE_API_TOKEN } from "./config";

const laravelHeaders = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-App-Token": MOBILE_API_TOKEN,
});

const hashLookupValue = (value) =>
  CryptoJS.SHA256(String(value || "").trim().toLowerCase()).toString(
    CryptoJS.enc.Hex,
  );

const unwrapLaravelData = (payload) => payload?.data ?? payload;

export const getDecryptedAlumniProfile = async (alumniId) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(`${LARAVEL_API_BASE_URL}/my-profile/${alumniId}`, {
    method: "GET",
    headers: {
      ...laravelHeaders(),
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Laravel profile request failed: ${response.status}`);
  }

  return unwrapLaravelData(await response.json());
};

/**
 * Alumni Profile Queries
 */

/**
 * Get alumni profile by ID
 */
export const getAlumniProfile = async (alumniId, viewerAlumniId = null) => {
  try {
    const queries = [
      getDecryptedAlumniProfile(alumniId),
      supabase
        .from("alumni_employments")
        .select(
          "id, job_title, company, location, career_description, start_date, end_date, is_current, created_at",
        )
        .eq("alumni_id", alumniId)
        .order("created_at", { ascending: false }),
    ];

    if (viewerAlumniId && viewerAlumniId !== alumniId) {
      queries.push(
        supabase
          .from("followers")
          .select("status")
          .eq("follower_alumni_id", viewerAlumniId)
          .eq("followed_alumni_id", alumniId)
          .maybeSingle(),
      );
    }

    const [data, employmentResult, followerResult] = await Promise.all(queries);

    const workExperiences = (employmentResult?.data || []).map(
      (employment) => ({
        id: employment.id,
        title: employment.job_title,
        subtitle: employment.company,
        period:
          employment.start_date || employment.end_date
            ? `${employment.start_date ? String(employment.start_date).slice(0, 4) : "Present"} - ${employment.end_date ? String(employment.end_date).slice(0, 4) : "Present"}`
            : "",
        startYear: employment.start_date
          ? Number(String(employment.start_date).slice(0, 4))
          : null,
        endYear: employment.end_date
          ? Number(String(employment.end_date).slice(0, 4))
          : null,
        is_current: employment.is_current,
        location: employment.location,
        description: employment.career_description,
      }),
    );

    const connectionStatus = followerResult?.data
      ? followerResult.data.status === 1
        ? "connected"
        : followerResult.data.status === 0
          ? "pending"
          : "none"
      : "none";

    // 🚨 FIX: Removed decryptAlumniRecord(data). Just return the data directly.
    const profileData = data
      ? {
          ...data,
          work_experiences: workExperiences,
          connection_status: connectionStatus,
        }
      : null;

    return profileData;
  } catch (error) {
    console.error("[alumni] Get profile error:", error.message);
    throw error;
  }
};

/**
 * Get alumni profile by email
 */
export const getAlumniByEmail = async (email) => {
  try {
    const emailHash = hashLookupValue(email);
    const { data: identity, error: identityError } = await supabase
      .from("alumnis_base")
      .select("id")
      .eq("email_hash", emailHash)
      .maybeSingle();

    if (identityError) {
      const errMsg = identityError.message || identityError.code || "";
      if (errMsg.includes("RLS") || errMsg.includes("policy")) {
        console.error(
          "[alumni] ❌ RLS Policy Error - Run SUPABASE_RLS_DISABLE.sql",
        );
      } else if (errMsg.includes("does not exist")) {
        console.error(
          "[alumni] ❌ Table does not exist - Check database schema",
        );
      } else {
        console.error(
          "[alumni] Get by email hash query error:",
          identityError.code,
          "-",
          identityError.message,
        );
      }
      throw identityError;
    }

    if (!identity?.id) return null;
    return await getDecryptedAlumniProfile(identity.id);
  } catch (error) {
    const errMsg = error.message || String(error);
    if (errMsg.includes("RLS")) {
      console.error(
        "[alumni] ❌ RLS POLICY ERROR: Row-Level Security is blocking queries",
      );
    } else if (errMsg.includes("Unauthorized")) {
      console.error("[alumni] ❌ UNAUTHORIZED: Check Supabase credentials");
    } else if (errMsg.includes("PGRST116")) {
      return null;
    } else {
      console.error("[alumni] Get by email exception:", errMsg);
    }
    throw error;
  }
};

export const updateAlumniProfile = async (alumniId, updates) => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("Please sign in again.");
  }

  const response = await fetch(
    `${LARAVEL_API_BASE_URL}/my-profile/${encodeURIComponent(alumniId)}`,
    {
      method: "PUT",
      headers: {
        ...laravelHeaders(),
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updates),
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message || `Profile update failed: ${response.status}`
    );

    // Keeps validation errors compatible with your screen's error handler.
    error.response = {
      status: response.status,
      data: payload,
    };

    throw error;
  }

  return unwrapLaravelData(payload);
};

/**
 * Create new alumni profile
 */
export const createAlumniProfile = async (alumniData) => {
  try {
    const { data, error } = await supabase
      .from("alumnis_base")
      // 🚨 FIX: Removed prepareAlumniPayload(alumniData)
      .insert([alumniData])
      .select()
      .single();

    if (error) throw error;
    // 🚨 FIX: Removed decryptAlumniRecord(data)
    return data;
  } catch (error) {
    console.error("[alumni] Create profile error:", error.message);
    throw error;
  }
};

/**
 * Search alumni by name or email
 */
export const searchAlumni = async (query) => {
  try {
    const raw = String(query ?? "").trim();
    if (!raw) return [];

    const safe = raw
      .replace(/[",\{\}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!safe) return [];

    const { data, error } = await supabase
      .from("alumnis_base")
      .select(
        "id, first_name, middle_name, last_name, alumni_photo, program, year_graduated",
      )
      .or(
        `first_name.ilike.%${safe}%, middle_name.ilike.%${safe}%, last_name.ilike.%${safe}%`,
      )
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[alumni] Search error:", error.message);
    throw error;
  }
};

/**
 * Get all alumni
 */
export const getAllAlumni = async (limit = 200) => {
  try {
    const { data, error } = await supabase
      .from("alumnis_base")
      .select(
        "id, first_name, middle_name, last_name, alumni_photo, program, year_graduated",
      )
      .order("first_name", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[alumni] Get all alumni error:", error.message);
    throw error;
  }
};

/**
 * Get alumni employment history
 */
export const getAlumniEmployment = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from("alumni_employments")
      .select("*")
      .eq("alumni_id", alumniId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[alumni] Get employment error:", error.message);
    throw error;
  }
};

const normalizeEmploymentPayload = (employmentData = {}) => {
  const endDate = employmentData.end_date ?? null;

  return {
    job_title: employmentData.job_title ?? employmentData.title ?? "",
    company: employmentData.company ?? employmentData.subtitle ?? "",
    location: employmentData.location ?? "",
    career_description:
      employmentData.career_description ?? employmentData.description ?? null,
    start_date: employmentData.start_date ?? null,
    end_date: endDate,
    is_current: employmentData.is_current ?? (endDate ? false : true),
  };
};

/**
 * Add employment record
 */
export const addEmploymentRecord = async (alumniId, employmentData) => {
  try {
    const { data, error } = await supabase
      .from("alumni_employments")
      .insert([
        { ...normalizeEmploymentPayload(employmentData), alumni_id: alumniId },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[alumni] Add employment error:", error.message);
    throw error;
  }
};

/**
 * Update employment record
 */
export const updateEmploymentRecord = async (employmentId, updates) => {
  try {
    const { data, error } = await supabase
      .from("alumni_employments")
      .update(normalizeEmploymentPayload(updates))
      .eq("id", employmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[alumni] Update employment error:", error.message);
    throw error;
  }
};

/**
 * Delete employment record
 */
export const deleteEmploymentRecord = async (employmentId) => {
  try {
    const { error } = await supabase
      .from("alumni_employments")
      .delete()
      .eq("id", employmentId);

    if (error) throw error;
  } catch (error) {
    console.error("[alumni] Delete employment error:", error.message);
    throw error;
  }
};

/**
 * Upload alumni photo to Supabase storage - BULLETPROOF BASE64 METHOD
 */
export const uploadAlumniPhoto = async (
  alumniId,
  imageSource,
  bucket = "luminus_assets",
) => {
  try {
    const isObject = typeof imageSource === "object" && imageSource !== null;
    const mimeType =
      isObject && imageSource.type ? imageSource.type : "image/jpeg";
    const base64Data = isObject ? imageSource.base64 : null;
    const ext = mimeType.split("/")[1] || "jpg";
    const folderPath = `alumni_photos/${alumniId}`;

    if (!base64Data) throw new Error("No base64 image data received.");

    // Delete old photos
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list(folderPath);
    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(
        (file) => `${folderPath}/${file.name}`,
      );
      await supabase.storage.from(bucket).remove(filesToRemove);
    }

    const safeName = `profile-${Date.now()}.${ext}`;
    const objectPath = `${folderPath}/${safeName}`;

    // 🚨 THE FIX: Use decode() to convert the base64 string directly into a pure ArrayBuffer
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, decode(base64Data), {
        contentType: mimeType,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectPath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: dbUpdateError } = await supabase
      .from("alumnis_base")
      .update({ alumni_photo: publicUrl })
      .eq("id", alumniId);

    if (dbUpdateError) throw dbUpdateError;

    return publicUrl;
  } catch (error) {
    console.error("[alumni] Upload photo error:", error.message || error);
    throw error;
  }
};

/**
 * Resolve the latest alumni photo stored in the alumni_photos folder
 */
export const getAlumniPhotoFromStorage = async (
  alumniId,
  bucket = "luminus_assets",
) => {
  try {
    const folderPath = `alumni_photos/${alumniId}`;
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(folderPath);

    if (error) throw error;
    if (!files || files.length === 0) return null;

    const sortedFiles = [...files].sort((left, right) => {
      const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
      const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();
      return rightTime - leftTime;
    });

    const latestFile =
      sortedFiles.find((file) => file.name === "profile.jpg") || sortedFiles[0];
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${folderPath}/${latestFile.name}`);

    const publicUrl = publicUrlData?.publicUrl ?? null;
    if (!publicUrl) return null;

    const versionSource = latestFile.updated_at || latestFile.created_at || Date.now();
    const version = new Date(versionSource).getTime() || Date.now();
    return `${publicUrl}?v=${version}`;
  } catch (error) {
    console.error(
      "[alumni] Get photo from storage error:",
      error.message || error,
    );
    return null;
  }
};

/**
 * Remove alumni photo from profile
 */
export const removeAlumniPhoto = async (alumniId) => {
  try {
    const { error } = await supabase
      .from("alumnis_base")
      .update({ alumni_photo: null })
      .eq("id", alumniId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to remove photo from database:", error);
    throw error;
  }
};