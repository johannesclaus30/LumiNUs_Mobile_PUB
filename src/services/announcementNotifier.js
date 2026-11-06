import supabase from "./supabase";
import { sendPushNotification } from "./NotificationSender";

let pollTimer = null;
let isInitialized = false;
let lastSeenScheduledAt = null; 
let lastSeenAnnouncementIds = new Set();

const cleanupAnnouncements = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isInitialized = false;
};

// Optional: If you needed the PST time shift hack we discussed earlier, 
// replace `new Date().toISOString()` with `getAdjustedPSTTime()` in the two spots below.
const getAdjustedPSTTime = () => {
  const now = new Date();
  now.setHours(now.getHours() + 8);
  return now.toISOString();
};

const sendAnnouncementNotification = async (announcement) => {
  try {
    const { data: alumniRows, error: alumniError } = await supabase
      .from("alumnis_base")
      .select("push_token")
      .not("push_token", "is", null);

    if (alumniError || !Array.isArray(alumniRows) || alumniRows.length === 0) {
      return;
    }

    const tokens = alumniRows.map((row) => row.push_token).filter(Boolean);

    if (tokens.length === 0) {
      return;
    }

    const title = announcement.title || "New Announcement";
    const body =
      announcement.announcement_description ||
      "Check out the latest announcement.";

    let imageUrl = null;
    try {
      const { data: imgRows, error: imgErr } = await supabase
        .from("images_announcements")
        .select("image_path")
        .eq("announcement_id", announcement.id)
        .limit(1);

      if (!imgErr && Array.isArray(imgRows) && imgRows.length > 0) {
        imageUrl = imgRows[0].image_path || null;
      }

      if (
        imageUrl &&
        typeof imageUrl === "string" &&
        !imageUrl.startsWith("http")
      ) {
        try {
          const { data: publicUrlData } = await supabase.storage
            .from("luminus_assets")
            .getPublicUrl(imageUrl);
          if (publicUrlData && publicUrlData.publicUrl) {
            imageUrl = publicUrlData.publicUrl;
          }
        } catch (err) {
          // ignore
        }
      }
    } catch (err) {
      // ignore
    }

    const pushData = {
      type: "announcement",
      announcementId: announcement.id,
      screen: "Home",
      targetScreen: "Feed",
      image: imageUrl,
    };

    await sendPushNotification(tokens, title, body.substring(0, 150), pushData);
  } catch (error) {
    // Silently handle notification errors
  }
};

const pollForNewAnnouncements = async () => {
  try {
    const nowIso = new Date().toISOString(); 

    let query = supabase
      .from("announcements")
      .select("id, title, announcement_description, scheduled_at")
      .lte("scheduled_at", nowIso) // Only fetch posts that have passed their scheduled time
      .order("scheduled_at", { ascending: true })
      .limit(50);

    // Only fetch announcements newer than the last one we saw
    if (lastSeenScheduledAt) {
      query = query.gt("scheduled_at", new Date(lastSeenScheduledAt).toISOString());
    }

    const { data, error } = await query;

    if (error || !Array.isArray(data) || data.length === 0) {
      return;
    }

    for (const row of data) {
      const rowTime = new Date(row.scheduled_at).getTime();
      const strId = String(row.id);
      
      // If we haven't sent a push for this ID yet, send it!
      if (!lastSeenAnnouncementIds.has(strId)) {
        await sendAnnouncementNotification(row);
        lastSeenAnnouncementIds.add(strId);
      }
      
      // Update our marker to the newest scheduled_at time we've processed
      if (!lastSeenScheduledAt || rowTime > lastSeenScheduledAt) {
        lastSeenScheduledAt = rowTime;
      }
    }

    // Keep the Set size manageable so we don't leak memory
    if (lastSeenAnnouncementIds.size > 200) {
      lastSeenAnnouncementIds = new Set(
        Array.from(lastSeenAnnouncementIds).slice(-100),
      );
    }
  } catch (error) {
    // Silently handle polling errors
  }
};

export const startAnnouncementNotifier = async () => {
  if (isInitialized) {
    return cleanupAnnouncements;
  }

  try {
    const nowIso = new Date().toISOString();

    // INITIALIZATION FIX: Find the most recently PUBLISHED announcement (not created)
    const { data, error } = await supabase
      .from("announcements")
      .select("id, scheduled_at")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: false })
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      lastSeenScheduledAt = new Date(data[0].scheduled_at).getTime();
    } else {
      lastSeenScheduledAt = Date.now(); // Fallback so we don't alert old stuff
    }

    await pollForNewAnnouncements();

    pollTimer = setInterval(() => {
      pollForNewAnnouncements();
    }, 30000);

    isInitialized = true;
  } catch (error) {
    // Silently handle initialization errors
  }

  return cleanupAnnouncements;
};