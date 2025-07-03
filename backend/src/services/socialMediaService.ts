import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import { ISocialAccount } from '../models/User';
import { User } from '../models/User';
import { config } from '../config/config';


export interface PostData {
  content: string;
  images?: string[];
  hashtags?: string[];
  videos?: string[]; // Added videos field
}

export class SocialMediaService {


  static async publishToTwitter(account: ISocialAccount, postData: PostData): Promise<any> {
  try {
    const oauth = new OAuth({
      consumer: {
        key: config.TWITTER_CLIENT_ID as string,
        secret: config.TWITTER_CLIENT_SECRET as string
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    const token = {
      key: account.accessToken, 
      secret: account.refreshToken as string
    };

    // Prepare tweet body
    const body: any = {
      text: postData.content
    };

    // Combine images and videos for upload
    const allMedia = [
      ...(postData.images || []),
      ...(postData.videos || [])
    ];
    if (allMedia.length > 0) {
      const mediaIds = await SocialMediaService.uploadMediaToTwitter(account, allMedia);
      if (mediaIds.length > 0) {
        body.media = { media_ids: mediaIds };
      }
    }

    const request_data = {
      url: 'https://api.twitter.com/2/tweets',
      method: 'POST',
      data: {}
    };

    const headers = oauth.toHeader(oauth.authorize(request_data, token));
    console.log(headers);

    const response = await axios.post(
      request_data.url,
      body,
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );

    return response.data;
  } catch (error: any) {
    console.error('Twitter publish error:', error.response?.data || error);
    throw new Error(`Twitter publish failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
}
  static async publishToTelegram(account: ISocialAccount, postData: PostData): Promise<any> {
  try {
      const botToken = account.accessToken;
      const chatId = account.id;

      if (postData.images && postData.images.length > 0) {
        const responses = [];
        for (let i = 0; i < postData.images.length; i++) {
          const imageUrl = postData.images[i];
          const caption = i === 0 ? postData.content : '';

          const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            chat_id: chatId,
            photo: imageUrl,
            caption: caption,
            parse_mode: 'HTML'
          });

          responses.push(response.data);
        }
        return responses;
      } else {
        const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId,
          text: postData.content,
          parse_mode: 'HTML'
        });

        return response.data;
      }
    } catch (error: any) {
        console.error('Telegram publish error:', error.response?.data || error.message);
        throw new Error(`Telegram publish failed: ${error.response?.data?.description || error.message}`);
    }
  }

  static async publishToReddit(account: ISocialAccount, postData: PostData): Promise<any> {
    let triedRefresh = false;
    while (true) {
      try {
        // Force subreddit to r/test for debugging
        const subreddit = "test";
        const title = postData.content.split('\n')[0] || postData.content.substring(0, 100);
        const media = [...(postData.images || []), ...(postData.videos || [])];

        // Try to post as image if media exists
        if (media.length > 0) {
          try {
            const assetId = await SocialMediaService.uploadMediaToReddit(account, media[0]);
            await new Promise(res => setTimeout(res, 1500)); // Wait for asset processing

            const postParams = new URLSearchParams({
              api_type: 'json',
              kind: 'image',
              sr: subreddit,
              title: title,
              url: assetId,
              resubmit: 'true',
              sendreplies: 'true'
            });

            const response = await axios.post('https://oauth.reddit.com/api/submit', postParams, {
              headers: {
                'Authorization': `Bearer ${account.accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': config.REDDIT_USER_AGENT
              }
            });

            if (response.data.json?.errors?.length > 0) {
              throw new Error(response.data.json.errors[0][1]);
            }
            return response.data;
          } catch (mediaError: any) {
            // If 401, try refresh
            if (mediaError.response?.status === 401 && !triedRefresh) {
              const newToken = await SocialMediaService.refreshRedditToken(account);
              account.accessToken = newToken;
              await User.updateOne(
                { 'socialAccounts._id': account.id },
                { $set: { 'socialAccounts.$.accessToken': newToken } }
              );
              triedRefresh = true;
              continue; // retry
            }
            // No fallback, just throw the error
            console.error("Reddit image upload failed:", mediaError.response?.data || mediaError.message);
            throw new Error(mediaError.response?.data?.message || mediaError.message || "Reddit image upload failed");
          }
        }

        // If no media, post as text
        if (media.length === 0) {
          const postParams = new URLSearchParams({
            api_type: 'json',
            kind: 'self',
            sr: subreddit,
            title: title,
            text: postData.content || ''
          });

          const response = await axios.post('https://oauth.reddit.com/api/submit', postParams, {
            headers: {
              'Authorization': `Bearer ${account.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': config.REDDIT_USER_AGENT
            }
          });

          if (response.data.json?.errors?.length > 0) {
            throw new Error(response.data.json.errors[0][1]);
          }
          return response.data;
        }
      } catch (error: any) {
        // If 401, try refresh once
        if (error.response?.status === 401 && !triedRefresh) {
          const newToken = await SocialMediaService.refreshRedditToken(account);
          account.accessToken = newToken;
          await User.updateOne(
            { 'socialAccounts._id': account.id },
            { $set: { 'socialAccounts.$.accessToken': newToken } }
          );
          triedRefresh = true;
          continue; // retry
        }
        console.error('Reddit publish error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message || 'Reddit publish failed');
      }
    }
  }

  private static async uploadMediaToTwitter(account: ISocialAccount, mediaUrls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];
    const oauth = new OAuth({
      consumer: {
        key: config.TWITTER_CLIENT_ID as string,
        secret: config.TWITTER_CLIENT_SECRET as string
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });
    const token = {
      key: account.accessToken,
      secret: account.refreshToken as string
    };

    for (const mediaUrl of mediaUrls) {
      try {
        // Download media
        const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        const mediaBuffer = Buffer.from(mediaResponse.data);

        // Detect media type
        const isVideo = mediaUrl.match(/\.(mp4|mov|webm)$/i);

        if (!isVideo) {
          // IMAGE: Simple upload
          const form = new FormData();
          form.append('media', mediaBuffer, { filename: 'image.jpg' });
          form.append('media_category', 'tweet_image');

          const request_data = {
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'POST'
          };
          const headers = {
            ...oauth.toHeader(oauth.authorize(request_data, token)),
            ...form.getHeaders()
          };

          const uploadResponse = await axios.post(
            request_data.url,
            form,
            { headers }
          );
          mediaIds.push(uploadResponse.data.media_id_string);
        } else {
          // VIDEO: Chunked upload
          // 1. INIT
          const initRequestData = {
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'POST'
          };
          const totalBytes = mediaBuffer.length;
          const mediaType = 'video/mp4';
          const initParams = new URLSearchParams({
            command: 'INIT',
            total_bytes: totalBytes.toString(),
            media_type: mediaType,
            media_category: 'tweet_video'
          });
          const initHeaders = oauth.toHeader(oauth.authorize(initRequestData, token));
          const initResp = await axios.post(
            `${initRequestData.url}?${initParams.toString()}`,
            null,
            { headers: { ...initHeaders } }
          );
          const mediaId = initResp.data.media_id_string;

          // 2. APPEND (chunk size: 5MB)
          const chunkSize = 5 * 1024 * 1024;
          let segmentIndex = 0;
          for (let offset = 0; offset < totalBytes; offset += chunkSize) {
            const chunk = mediaBuffer.slice(offset, offset + chunkSize);
            const appendForm = new FormData();
            appendForm.append('command', 'APPEND');
            appendForm.append('media_id', mediaId);
            appendForm.append('segment_index', segmentIndex.toString());
            appendForm.append('media', chunk, { filename: 'video.mp4' });

            const appendHeaders = {
              ...oauth.toHeader(oauth.authorize(initRequestData, token)),
              ...appendForm.getHeaders()
            };
            await axios.post(
              initRequestData.url,
              appendForm,
              { headers: appendHeaders }
            );
            segmentIndex++;
          }

          // 3. FINALIZE
          const finalizeParams = new URLSearchParams({
            command: 'FINALIZE',
            media_id: mediaId
          });
          const finalizeHeaders = oauth.toHeader(oauth.authorize(initRequestData, token));
          await axios.post(
            `${initRequestData.url}?${finalizeParams.toString()}`,
            null,
            { headers: { ...finalizeHeaders } }
          );

          // Optionally: Wait for processing (poll STATUS)
          // For simplicity, just push mediaId
          mediaIds.push(mediaId);
        }
      } catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
          const err = error as { response?: any; message?: string };
          console.error('Twitter media upload error:', err.response?.data || err.message);
        } else {
          console.error('Twitter media upload error:', (error as Error).message || error);
        }
      }
    }
    return mediaIds;
  }

  private static async uploadMediaToReddit(account: ISocialAccount, mediaUrl: string): Promise<string> {
    // Download the media
    const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const mediaBuffer = Buffer.from(mediaResponse.data);

    // Step 1: Get upload lease
    let args: any;
    try {
      const leaseResp = await axios.post(
        'https://oauth.reddit.com/api/media/asset.json',
        { filepath: 'media.png' },
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': config.REDDIT_USER_AGENT,
            'Accept': 'application/json'
          }
        }
      );
      console.log('Reddit leaseResp.data:', leaseResp.data);
      args = leaseResp.data.args;
    } catch (error: any) {
      console.error('Reddit lease error:', error.response?.data || error.message);
      throw error;
    }
    const uploadUrl = args.action;
    const fields = args.fields;

    // Step 2: Upload to S3
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, value as string));
    form.append('file', mediaBuffer, { filename: 'media.png' });

    await axios.post(uploadUrl, form, { headers: form.getHeaders() });

    // Step 3: Return asset_id
    return args.asset_id;
  }

   static async refreshRedditToken(account: ISocialAccount): Promise<string> {
    try {
      const auth = Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString('base64');
      
      const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken!
        }), {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': config.REDDIT_USER_AGENT
          }
        }
      );
      
      return response.data.access_token;
    } catch (error: any) {
      console.error('Reddit token refresh error:', error);
      throw new Error('Failed to refresh Reddit token');
    }
  }
}
