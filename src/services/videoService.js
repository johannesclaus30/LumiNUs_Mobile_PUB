// services/videoService.js
import * as VideoThumbnails from 'expo-video-thumbnails';
import supabase from './supabase';

/**
 * Upload a video with an automatically generated thumbnail
 * @param {string} videoUri - Local URI of the video
 * @param {string} bucket - Supabase storage bucket (default: 'luminus_assets')
 * @param {string} folder - Folder to store the video (default: 'videos')
 * @returns {Promise<{videoUrl: string, thumbnailUrl: string, videoPath: string, thumbPath: string}>}
 */
export const uploadVideoWithThumbnail = async (videoUri, bucket = 'luminus_assets', folder = 'videos') => {
  try {
    console.log('🎬 Starting video upload with thumbnail generation...');

    // 1. Generate thumbnail from the video
    console.log('📸 Generating thumbnail...');
    const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000, // Take frame at 1 second
      quality: 0.6,
    });
    console.log('✅ Thumbnail generated at:', thumbnail.uri);

    // 2. Generate unique filenames
    const timestamp = Date.now();
    const videoFileName = `${folder}/video_${timestamp}.mp4`;
    const thumbFileName = `thumbnails/thumb_${timestamp}.jpg`;

    // 3. Upload video to Supabase Storage
    console.log('📤 Uploading video...');

    const videoFormData = new FormData();
    videoFormData.append('file', {
      uri: videoUri,
      name: `video_${timestamp}.mp4`,
      type: 'video/mp4',
    });

    const { data: videoData, error: videoError } = await supabase.storage
      .from(bucket)
      .upload(videoFileName, videoFormData, {
        cacheControl: '3600',
        upsert: false,
      });

    if (videoError) {
      console.error('❌ Video upload error:', videoError);
      throw videoError;
    }
    console.log('✅ Video uploaded successfully');

    // 4. Upload thumbnail to Supabase Storage
    console.log('📤 Uploading thumbnail...');
    
    const thumbFormData = new FormData();
    thumbFormData.append('file', {
      uri: thumbnail.uri,
      name: `thumb_${timestamp}.jpg`,
      type: 'image/jpeg',
    });

    const { data: thumbData, error: thumbError } = await supabase.storage
      .from(bucket)
      .upload(thumbFileName, thumbFormData, {
        cacheControl: '3600',
        upsert: false,
      });

    if (thumbError) {
      console.error('❌ Thumbnail upload error:', thumbError);
      throw thumbError;
    }
    console.log('✅ Thumbnail uploaded successfully');

    // 5. Get public URLs
    const { data: videoPublicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(videoData.path);

    const { data: thumbPublicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(thumbData.path);

    console.log('🎉 Upload complete!');
    console.log('🎬 Video URL:', videoPublicUrl.publicUrl);
    console.log('🖼️ Thumbnail URL:', thumbPublicUrl.publicUrl);

    return {
      videoUrl: videoPublicUrl.publicUrl,
      thumbnailUrl: thumbPublicUrl.publicUrl,
      videoPath: videoData.path,
      thumbPath: thumbData.path,
    };
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
};

/**
 * Get a signed URL for a video (if your bucket is private)
 */
export const getVideoSignedUrl = async (path, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from('luminus_assets')
      .createSignedUrl(path, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
};