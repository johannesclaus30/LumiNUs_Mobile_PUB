// src/utils/feedAlgorithm.js

/**
 * Easily tunable weights for A/B testing feed engagement
 */
const FEED_CONFIG = {
  BASELINE: 10,
  VIDEO_BOOST: 25,
  CAROUSEL_BOOST: 15,
  IMAGE_BOOST: 10,
  FRESHNESS_BOOST: 15,
  DIRECT_CONNECTION: 40,
  MUTUAL_INTERACTION: 20,
  COLD_START: 50,
  PROGRAM_MATCH: 25,
  DISCIPLINE_MATCH: 10,
  BATCH_MATCH: 20,
  LONG_CAPTION_BOOST: 15,
  MED_CAPTION_BOOST: 10,
  PROFESSIONAL_BOOST: 20,
  MILESTONE_BOOST: 40,      
  DISCUSSION_BOOST: 25,     
  LOW_EFFORT_PENALTY: -30,  
  
  ANNOUNCEMENT_BASE: 100,         
  ANNOUNCEMENT_DECAY_RATE: 1.5,   
  
  VELOCITY_MULTIPLIER: 1.3,
  GOLDEN_HOUR_MULTIPLIER: 1.6, 
  GRAVITY_DECAY: 1.2,
  AUTHOR_SPACING_STRIDE: 3,

  // 🔥 NEW: Creates up to a 40% swing (+/- 20%) in final scores on refresh
  SHUFFLE_VARIANCE: 0.4 
};

/**
 * Compiled Regex for fast, strict word-boundary matching
 */
const PROFESSIONAL_KEYWORDS = /\b(hiring|promotion|opening|business|opportunity|referral|graduated|upwork|freelance|figma|firebase|github|transcribe|developer|engineer|designer|manager|startup|founder)\b/i;

const MILESTONE_KEYWORDS = /\b(married|engaged|wedding|baby|welcomed|award|certified|certificate|passed|board exam|licensed|champion|first place|accepted)\b/i;

const PROGRAM_DISCIPLINES = {
  computing: ['bsit', 'bscs', 'bscpe', 'bsis', 'act', 'computer', 'information technology', 'software'],
  business: ['bsba', 'bsa', 'bsais', 'bshm', 'bstm', 'accountancy', 'marketing', 'finance', 'hospitality', 'tourism'],
  engineering: ['bsee', 'bsce', 'bsme', 'bsece', 'bsie', 'engineering', 'civil', 'electrical', 'mechanical'],
  health: ['bsn', 'bsmt', 'bspt', 'nursing', 'medical technology', 'pharmacy', 'health'],
  arts_sciences: ['bacomm', 'bspsych', 'psychology', 'communication', 'arts', 'multimedia', 'criminology']
};

const getDisciplineCategory = (programStr) => {
  if (!programStr) return null;
  const clean = String(programStr).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  for (const [category, keywords] of Object.entries(PROGRAM_DISCIPLINES)) {
    if (keywords.some((kw) => clean.includes(kw))) {
      return category;
    }
  }
  return null;
};

export const getFeedItemTimestamp = (item) => {
  const rawValue = item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;
  if (!rawValue) return 0;
  const timestamp = new Date(rawValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const isVideo = (uri) => {
  if (!uri) return false;
  const lowerUri = String(uri).toLowerCase();
  return lowerUri.includes('.mp4') || lowerUri.includes('.mov') || lowerUri.includes('.webm') || lowerUri.includes('.mkv');
};

/**
 * Generates a consistent random multiplier based on post ID and refresh nonce.
 * If variance is 0.4, it returns a multiplier between 0.8 and 1.2
 */
const getPseudoRandomMultiplier = (str, variance) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; 
  }
  // Normalize hash to a float between 0.000 and 0.999
  const normalized = (Math.abs(hash) % 1000) / 1000;
  
  // Calculate lower bound (e.g., 1.0 - 0.2 = 0.8)
  const lowerBound = 1 - (variance / 2);
  
  return lowerBound + (normalized * variance);
};

/**
 * The FB/IG/LinkedIn Hybrid Feed Algorithm
 */
export const sortFeedPosts = (posts, feedSortMode, feedRefreshNonce, connections, userData) => {
  const sourcePosts = Array.isArray(posts) ? [...posts] : [];
  
  if (feedSortMode === 'newest') {
    return sourcePosts.sort((a, b) => getFeedItemTimestamp(b) - getFeedItemTimestamp(a));
  }

  const connectionIds = new Set(
    (connections || [])
      .map((c) => String(c?.id ?? c?.alumni_id ?? ''))
      .filter(Boolean)
  );

  const myRawProgram = String(userData?.program || userData?.course || '').toLowerCase().trim();
  const myProgramClean = myRawProgram.replace(/[^a-z0-9]/g, '');
  const myDiscipline = getDisciplineCategory(myRawProgram);
  const myBatch = String(userData?.batch || userData?.grad_year || userData?.year_graduated || '').trim();

  let scoredPosts = sourcePosts.map((item) => {
    let baseScore = FEED_CONFIG.BASELINE; 
    
    const isAnnouncement = item?.feed_type === 'announcement';
    const authorId = String(item?.alumni?.id ?? '');
    
    const authorRawProgram = String(item?.alumni?.program || item?.alumni?.course || '').toLowerCase().trim();
    const authorProgramClean = authorRawProgram.replace(/[^a-z0-9]/g, '');
    const authorDiscipline = getDisciplineCategory(authorRawProgram);
    const authorBatch = String(item?.alumni?.batch || item?.alumni?.grad_year || item?.alumni?.year_graduated || '').trim();

    const postTimestamp = getFeedItemTimestamp(item);
    const ageInHours = Math.max(0, (Date.now() - postTimestamp) / (1000 * 60 * 60));

    // --- 1. GRANULAR MEDIA & EFFORT WEIGHTING ---
    const mediaItems = Array.isArray(item?.images) ? item.images : [];
    const captionText = String(item?.caption || item?.announcement_description || '').toLowerCase();
    const captionLength = captionText.length;

    if (mediaItems.length > 0) {
      const hasVideo = mediaItems.some(m => isVideo(m?.image_url || m?.image_path || m?.uri));
      if (hasVideo) {
        baseScore += FEED_CONFIG.VIDEO_BOOST;
      } else if (mediaItems.length > 1) {
        baseScore += FEED_CONFIG.CAROUSEL_BOOST;
      } else {
        baseScore += FEED_CONFIG.IMAGE_BOOST;
      }
    } else if (captionLength < 20 && !isAnnouncement) {
      baseScore += FEED_CONFIG.LOW_EFFORT_PENALTY;
    }

    if (ageInHours < 4) baseScore += FEED_CONFIG.FRESHNESS_BOOST; 

    // --- 2. THE SOCIAL GRAPH ---
    const isDirectConnection = authorId && connectionIds.has(authorId);
    if (isDirectConnection) baseScore += FEED_CONFIG.DIRECT_CONNECTION;

    // --- 3. SECOND-DEGREE SOCIAL PROOF ---
    const interactorIds = Array.isArray(item?.interactor_ids) ? item.interactor_ids : [];
    const hasNetworkInteraction = interactorIds.some(id => connectionIds.has(String(id)));
    if (hasNetworkInteraction && !isDirectConnection) {
      baseScore += FEED_CONFIG.MUTUAL_INTERACTION; 
    }

    // --- 4. ENGAGEMENT & VIRALITY ---
    const reactCount = item?.reaction_count ?? 0;
    const commCount = item?.comment_count ?? 0;
    const repCount = item?.repost_count ?? 0;

    const weightedEngagement = (reactCount * 1) + (commCount * 3) + (repCount * 4);
                             
    if (weightedEngagement > 0) {
      baseScore += Math.log10(weightedEngagement + 1) * 35; 
      
      const velocity = weightedEngagement / Math.max(0.5, ageInHours);
      
      if (ageInHours <= 2 && velocity > 3) {
        baseScore *= FEED_CONFIG.GOLDEN_HOUR_MULTIPLIER;
      } else if (velocity > 2) { 
        baseScore *= FEED_CONFIG.VELOCITY_MULTIPLIER; 
      }

      if (commCount > 0 && commCount >= reactCount / 2) {
        baseScore += FEED_CONFIG.DISCUSSION_BOOST;
      }
    }

    // --- 5. THE COLD START BOOST ---
    if (item?.alumni?.is_new_alumni || item?.is_first_post) {
      baseScore += FEED_CONFIG.COLD_START; 
    }

    // --- 6. AFFINITY & MILESTONES ---
    if (myProgramClean && authorProgramClean && myProgramClean === authorProgramClean) {
      baseScore += FEED_CONFIG.PROGRAM_MATCH; 
    } else if (myDiscipline && authorDiscipline && myDiscipline === authorDiscipline) {
      baseScore += FEED_CONFIG.DISCIPLINE_MATCH; 
    }

    if (myBatch && authorBatch && myBatch === authorBatch) {
      baseScore += FEED_CONFIG.BATCH_MATCH; 
    }

    if (captionLength > 300) baseScore += FEED_CONFIG.LONG_CAPTION_BOOST; 
    else if (captionLength > 150) baseScore += FEED_CONFIG.MED_CAPTION_BOOST; 

    // Semantic Parsing
    if (PROFESSIONAL_KEYWORDS.test(captionText)) {
      baseScore += FEED_CONFIG.PROFESSIONAL_BOOST; 
    }
    if (MILESTONE_KEYWORDS.test(captionText)) {
      baseScore += FEED_CONFIG.MILESTONE_BOOST;
    }

    // Dynamic Announcement Decay
    if (isAnnouncement) {
      const dynamicAnnouncementBoost = Math.max(0, FEED_CONFIG.ANNOUNCEMENT_BASE - (ageInHours * FEED_CONFIG.ANNOUNCEMENT_DECAY_RATE));
      baseScore += dynamicAnnouncementBoost;
    }

    // 🔥 NEW: Apply the Shuffle Multiplier based on the Refresh Nonce
    const itemKey = String(item?.id ?? item?.feed_id ?? Math.random());
    const shuffleMultiplier = getPseudoRandomMultiplier(`${itemKey}_${feedRefreshNonce}`, FEED_CONFIG.SHUFFLE_VARIANCE);

    // --- GRAVITY DECAY ---
    const finalScore = (baseScore * shuffleMultiplier) / Math.pow(ageInHours + 2, FEED_CONFIG.GRAVITY_DECAY);

    return { 
      item, 
      finalScore, 
      authorId, 
      isAnnouncement,
      timestamp: postTimestamp 
    };
  });

  scoredPosts.sort((a, b) => b.finalScore - a.finalScore || b.timestamp - a.timestamp);

  // --- SMART MEDIA DIVERSITY BUILDER (STRIDE INJECTION) ---
  const finalFeed = [];
  const recentAuthors = []; 
  const delayedQueue = [];

  for (const post of scoredPosts) {
    if (post.isAnnouncement || !post.authorId) {
      finalFeed.push(post.item);
      continue;
    }

    // Check if author posted recently within the stride limit
    if (recentAuthors.includes(post.authorId)) {
      delayedQueue.push(post.item);
    } else {
      finalFeed.push(post.item);
      recentAuthors.push(post.authorId);
      
      // Keep track of the last N authors to enforce the stride
      if (recentAuthors.length > FEED_CONFIG.AUTHOR_SPACING_STRIDE) {
        recentAuthors.shift(); 
      }
    }
  }

  // Interleave delayed posts back into the feed using the Stride step
  let insertionIndex = FEED_CONFIG.AUTHOR_SPACING_STRIDE;
  while (delayedQueue.length > 0) {
    if (insertionIndex >= finalFeed.length) {
      finalFeed.push(...delayedQueue);
      break;
    }
    finalFeed.splice(insertionIndex, 0, delayedQueue.shift());
    insertionIndex += (FEED_CONFIG.AUTHOR_SPACING_STRIDE + 1);
  }

  return finalFeed;
};