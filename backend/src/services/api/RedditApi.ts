import axios from 'axios';
import { ISocialMediaApi } from '../../types';
import { config } from '../../config/config';
import FormData from 'form-data'; 

export class RedditApi implements ISocialMediaApi {
  private accessToken: string;
  private refreshTokenValue: string;
  private baseUrl = 'https://oauth.reddit.com';

  constructor(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshTokenValue = refreshToken;
  }

  static getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.REDDIT_CLIENT_ID!,
      response_type: 'code',
      state: state,
      redirect_uri: config.REDDIT_CALLBACK_URL!,
      duration: 'permanent',
      scope: 'identity submit read history',
    });
    return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<any> {
    const auth = Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.REDDIT_CALLBACK_URL!
      }), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': config.REDDIT_USER_AGENT
        }
      }
    );
    
    return response.data;
  }

  static async getUserInfo(accessToken: string): Promise<any> {
    const response = await axios.get('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': config.REDDIT_USER_AGENT
      }
    });
    return response.data;
  }

  async post(text: string, options: { subreddit: string; media?: string[] }): Promise<any> {
    try {
      // Check if token needs refreshing
      await this.refreshToken();
      const title = text.split('\n')[0] || text.substring(0, 100);
      const media = options.media || [];

      // Try to post as image if media exists
      if (media.length > 0) {
        try {
          const assetId = await this.uploadMedia(media[0]);
          await new Promise(res => setTimeout(res, 1500)); // Wait for asset processing

          const postParams = new URLSearchParams({
            api_type: 'json',
            kind: 'image',
            sr: options.subreddit || 'test',
            title: title,
            url: assetId,
            resubmit: 'true',
            sendreplies: 'true'
          });

          const response = await axios.post(`${this.baseUrl}/api/submit`, postParams, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': config.REDDIT_USER_AGENT
            }
          });

          if (response.data.json?.errors?.length > 0) {
            throw new Error(response.data.json.errors[0][1]);
          }
          return response.data;
        } catch (mediaError: any) {
          console.error("Reddit image upload failed:", mediaError.response?.data || mediaError.message);
          throw new Error(mediaError.response?.data?.message || mediaError.message || "Reddit image upload failed");
        }
      }

      // If no media, post as text
      const postParams = new URLSearchParams({
        api_type: 'json',
        kind: 'self',
        sr: options.subreddit || 'test',
        title: title,
        text: text || ''
      });

      const response = await axios.post(`${this.baseUrl}/api/submit`, postParams, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': config.REDDIT_USER_AGENT
        }
      });

      if (response.data.json?.errors?.length > 0) {
        throw new Error(response.data.json.errors[0][1]);
      }
      return response.data;
    } catch (error: any) {
      console.error('Reddit publish error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Reddit publish failed');
    }
  }

  async getPost(id: string): Promise<any> {
    try {
      await this.refreshToken();
      const response = await axios.get(`https://www.reddit.com/comments/${id}.json`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': config.REDDIT_USER_AGENT
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Reddit post:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Reddit post: ${error.message}`);
    }
  }

  async deletePost(id: string): Promise<void> {
    try {
      await this.refreshToken();
      const response = await axios.post(`${this.baseUrl}/api/del`, `id=t3_${id}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': config.REDDIT_USER_AGENT
        }
      });
      if (response.data.json?.errors?.length > 0) {
        throw new Error(response.data.json.errors[0][1]);
      }
    } catch (error: any) {
      console.error('Error deleting Reddit post:', error.response?.data || error.message);
      throw new Error(`Failed to delete Reddit post: ${error.message}`);
    }
  }

  async getUserProfile(username: string): Promise<any> {
    try {
      await this.refreshToken();
      const response = await axios.get(`https://www.reddit.com/user/${username}/about.json`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': config.REDDIT_USER_AGENT
        }
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching Reddit user profile:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Reddit user profile: ${error.message}`);
    }
  }

  async getSubredditSubscribers(subredditName: string): Promise<number> {
    try {
      await this.refreshToken();
      const response = await axios.get(
        `https://www.reddit.com/r/${subredditName}/about.json`,
        { headers: { 'User-Agent': config.REDDIT_USER_AGENT } }
      );
      return response.data.data.subscribers;
    } catch (error: any) {
      console.error('Error fetching Reddit subreddit subscribers:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Reddit subreddit subscribers: ${error.message}`);
    }
  }

  private async uploadMedia(mediaUrl: string): Promise<string> {
    // Download the media
    const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const mediaBuffer = Buffer.from(mediaResponse.data);
    const contentType = mediaResponse.headers['content-type'];

    // Step 1: Get upload lease
    let args: any;
    try {
      const leaseResp = await axios.post(
        'https://oauth.reddit.com/api/media/asset.json',
        {
          filepath: `reddit_upload_${Date.now()}.${contentType.split('/')[1]}`, 
          mimetype: contentType
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': config.REDDIT_USER_AGENT,
            'Accept': 'application/json'
          }
        }
      );
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
    form.append('file', mediaBuffer, { filename: `reddit_upload_${Date.now()}.${contentType.split('/')[1]}` , contentType: contentType });

    await axios.post(uploadUrl, form, { headers: form.getHeaders() });

    // Step 3: Return asset_id
    return args.asset_id;
  }

  async refreshToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString('base64');
      
      const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshTokenValue
        }), {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': config.REDDIT_USER_AGENT
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      return this.accessToken; // Return the new access token
    } catch (error: any) {
      console.error('Reddit token refresh error:', error);
      throw new Error('Failed to refresh Reddit token');
    }
  }
}