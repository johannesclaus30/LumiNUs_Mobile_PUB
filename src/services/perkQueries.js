import supabase from "./supabase";
import { normalizePerkImageUri } from "../utils/imageUtils";

/**
 * Normalize a raw perk from Supabase, converting image_path values to full URLs.
 */
const normalizePerk = (perk) => {
  if (!perk) return null;

  const normalizedImages = Array.isArray(perk.images)
    ? perk.images.map((image) => ({
        ...image,
        image_path: normalizePerkImageUri(image?.image_path ?? ""),
      }))
    : [];

  return {
    ...perk,
    images: normalizedImages,
  };
};

export const getPerks = async () => {
  const { data, error } = await supabase
    .from("perks")
    .select(
      `
      id, title, description, valid_until, status,
      images:images_perks(id, image_path)
    `,
    )
    .or("status.is.null,status.eq.1")
    .eq("is_manually_restored", false)   // ✅ ADD THIS LINE
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[perks] Query error:", error.code, "-", error.message);
    throw error;
  }

  return (data || []).map(normalizePerk);
};
