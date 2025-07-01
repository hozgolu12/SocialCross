import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import axios from 'axios';
import { ISocialAccount } from '../models/User';
import { User } from '../models/User';
import { config } from '../config/config';


export interface PostData {
  content: string;
  images?: string[];
  hashtags?: string[];
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

    // If images are present, upload them and attach media IDs
    if (postData.images && postData.images.length > 0) {
      const mediaIds = await SocialMediaService.uploadImagesToTwitter(account.accessToken, postData.images);
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
    try {
      // Reddit API - Submit post
      const url = 'https://oauth.reddit.com/api/submit';
      
      // Extract title from content (first line or first 100 characters)
      const title = postData.content.split('\n')[0] || postData.content.substring(0, 100);
      const text = postData.content;
      
      const postParams = new URLSearchParams({
        api_type: 'json',
        kind: 'self', // Text post
        sr: 'test', // Default subreddit - should be configurable
        title: title,
        text: text
      });

      const response = await axios.post(url, postParams, {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': config.REDDIT_USER_AGENT
        }
      });

      if (response.data.json?.errors?.length > 0) {
        throw new Error(response.data.json.errors[0][1]);
      }
      console.log("Reddit response:", response.data);
      return response.data;
    } catch (error: any) {
      // Detect token expiration
      if (
        error.response?.status === 401 ||
        (error.response?.data?.error === 'invalid_token')
      ) {
        // Mark Reddit account as inactive
        const user = await User.findOne({ 'socialAccounts.id': account.id });
        if (user) {
          const redditAcc = user.socialAccounts.find(acc => acc.platform === 'reddit' && acc.id === account.id);
          if (redditAcc) {
            redditAcc.isActive = false;
            await user.save();
          }
        }
        throw new Error('Reddit token expired. Please reconnect your Reddit account.');
      }
      console.error('Reddit publish error:', error.response?.data || error.message);
      throw new Error(`Reddit publish failed: ${error.response?.data?.message || error.message}`);
    }
  }

  private static async uploadImagesToTwitter(accessToken: string, images: string[]): Promise<string[]> {
    const mediaIds: string[] = [];
    
    for (const imageUrl of images) {
      try {
        // Download image
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        // Upload to Twitter
        const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
        const uploadResponse = await axios.post(uploadUrl, {
          media_data: imageBuffer.toString('base64')
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        mediaIds.push(uploadResponse.data.media_id_string);
      } catch (error) {
        console.error('Twitter image upload error:', error);
      }
    }

    return mediaIds;
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
