
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import { ISocialMediaApi } from '../../types'; // Renamed to avoid conflict
import { config as appConfig } from '../../config/config'; // Renamed to avoid conflict
import { User as UserModel } from '../../models/User'; // Renamed to avoid conflict
import { ISocialAccount } from '../../types';
import { Strategy as TwitterStrategy } from 'passport-twitter';

export class TwitterApi implements ISocialMediaApi {
  private oauth: OAuth;
  private token: { key: string; secret: string };

  constructor(accessToken: string, refreshToken: string) {
    this.oauth = new OAuth({
      consumer: {
        key: appConfig.TWITTER_CLIENT_ID as string,
        secret: appConfig.TWITTER_CLIENT_SECRET as string,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });
    this.token = {
      key: accessToken,
      secret: refreshToken,
    };
  }

  static getPassportStrategy(User: typeof UserModel, config: typeof appConfig): TwitterStrategy {
    return new TwitterStrategy({
      consumerKey: config.TWITTER_CLIENT_ID as string,
      consumerSecret: config.TWITTER_CLIENT_SECRET as string,
      callbackURL: config.TWITTER_CALLBACK_URL ?? '/auth/twitter/callback'
    },
    async (token, tokenSecret, profile, done) => {
      try {
        const result = await TwitterApi.handleOAuthCallback(profile, token, tokenSecret);
        if (result.profile) {
          // This means a new user needs to be created or linked
          return done(null, result);
        } else {
          // Existing user found and updated
          return done(null, result);
        }
      } catch (error) {
        return done(error);
      }
    });
  }

  static async handleOAuthCallback(profile: any, token: string, tokenSecret: string, userId?: string): Promise<any> {
    try {
      let user = null;
      if (userId) {
        user = await UserModel.findById(userId);
      } else {
        user = await UserModel.findOne({ 'socialAccounts.twitter.id': profile.id });
      }

      if (user) {
        const existingAccountIndex = user.socialAccounts.findIndex(
          acc => acc.platform === 'twitter'
        );

        const twitterAccount: ISocialAccount = {
          platform: 'twitter',
          id: profile.id,
          username: profile.username,
          accessToken: token,
          refreshToken: tokenSecret,
          isActive: true,
          connectedAt: new Date(),
        };

        if (existingAccountIndex >= 0) {
          user.socialAccounts[existingAccountIndex] = twitterAccount;
        } else {
          user.socialAccounts.push(twitterAccount);
        }
        await user.save();
        return user;
      } else {
        // If no user found by userId or existing social account, return profile data for new user creation
        return { profile, token, tokenSecret };
      }
    } catch (error) {
      console.error('Error handling Twitter OAuth callback:', error);
      throw error;
    }
  }

  async post(text: string, options?: { media?: string[] }): Promise<any> {
    try {
      const body: any = {
        text,
      };

      if (options?.media && options.media.length > 0) {
        const mediaIds = await this.uploadMedia(options.media);
        if (mediaIds.length > 0) {
          body.media = { media_ids: mediaIds };
        }
      }

      const request_data = {
        url: 'https://api.twitter.com/2/tweets',
        method: 'POST',
        data: {},
      };

      const headers = this.oauth.toHeader(this.oauth.authorize(request_data, this.token));

      const response = await axios.post(request_data.url, body, {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });

      return response.data;
    } catch (error: any) {
      console.error('Twitter publish error:', error.response?.data || error);
      throw new Error(`Twitter publish failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  async getPost(id: string): Promise<any> {
    try {
      const request_data = {
        url: `https://api.twitter.com/1.1/statuses/show.json?id=${id}`,
        method: 'GET',
        data: {},
      };
      const headers = this.oauth.toHeader(this.oauth.authorize(request_data, this.token)) as any;
      const response = await axios.get(request_data.url, { headers });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Twitter post:', error.response?.data || error);
      throw new Error(`Failed to fetch Twitter post: ${error.message}`);
    }
  }

  async deletePost(id: string): Promise<void> {
    try {
      const request_data = {
        url: `https://api.twitter.com/1.1/statuses/destroy/${id}.json`,
        method: 'POST',
        data: {},
      };
      const headers = this.oauth.toHeader(this.oauth.authorize(request_data, this.token)) as any;
      await axios.post(request_data.url, null, { headers });
    } catch (error: any) {
      console.error('Error deleting Twitter post:', error.response?.data || error);
      throw new Error(`Failed to delete Twitter post: ${error.message}`);
    }
  }

  async getUserProfile(userId: string): Promise<any> {
    try {
      const request_data = {
        url: `https://api.twitter.com/1.1/users/show.json?user_id=${userId}`,
        method: 'GET',
        data: {},
      };
      const headers = this.oauth.toHeader(this.oauth.authorize(request_data, this.token)) as any;
      const response = await axios.get(request_data.url, { headers });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.errors?.[0]?.message || error.message || 'Unknown error';
      console.error('Error fetching Twitter user profile:', errorMessage);
      throw new Error(`Failed to fetch Twitter user profile: ${errorMessage}`);
    }
  }

  async getRecentTweetsEngagement(userId: string): Promise<{ likes: number; retweets: number; replies: number }> {
    try {
      const request_data = {
        url: `https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=${userId}&count=5`, // Fetch last 5 tweets
        method: 'GET',
        data: {},
      };
      const headers = this.oauth.toHeader(this.oauth.authorize(request_data, this.token)) as any;
      const response = await axios.get(request_data.url, { headers });
      
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;

      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((tweet: any) => {
          totalLikes += tweet.favorite_count || 0;
          totalRetweets += tweet.retweet_count || 0;
          totalReplies += tweet.reply_count || 0;
        });
      }

      return { likes: totalLikes, retweets: totalRetweets, replies: totalReplies };
    } catch (error: any) {
      console.error('Error fetching Twitter recent tweets engagement:', error.response?.data || error);
      throw new Error(`Failed to fetch Twitter recent tweets engagement: ${error.message}`);
    }
  }

  private async uploadMedia(mediaUrls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const mediaUrl of mediaUrls) {
      try {
        const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        const mediaBuffer = Buffer.from(mediaResponse.data);
        const isVideo = mediaUrl.match(/\.(mp4|mov|webm)$/i);

        if (!isVideo) {
          const form = new FormData();
          form.append('media', mediaBuffer, { filename: 'image.jpg' });
          form.append('media_category', 'tweet_image');

          const request_data = {
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'POST',
          };
          const headers = {
            ...this.oauth.toHeader(this.oauth.authorize(request_data, this.token)),
            ...form.getHeaders(),
          };

          const uploadResponse = await axios.post(request_data.url, form, { headers });
          mediaIds.push(uploadResponse.data.media_id_string);
        } else {
          const initRequestData = {
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'POST',
          };
          const totalBytes = mediaBuffer.length;
          const mediaType = 'video/mp4';
          const initParams = new URLSearchParams({
            command: 'INIT',
            total_bytes: totalBytes.toString(),
            media_type: mediaType,
            media_category: 'tweet_video',
          });
          const initHeaders = this.oauth.toHeader(this.oauth.authorize(initRequestData, this.token));
          const initResp = await axios.post(`${initRequestData.url}?${initParams.toString()}`, null, {
            headers: { ...initHeaders },
          });
          const mediaId = initResp.data.media_id_string;

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
              ...this.oauth.toHeader(this.oauth.authorize(initRequestData, this.token)),
              ...appendForm.getHeaders(),
            };
            await axios.post(initRequestData.url, appendForm, { headers: appendHeaders });
            segmentIndex++;
          }

          const finalizeParams = new URLSearchParams({
            command: 'FINALIZE',
            media_id: mediaId,
          });
          const finalizeHeaders = this.oauth.toHeader(this.oauth.authorize(initRequestData, this.token));
          await axios.post(`${initRequestData.url}?${finalizeParams.toString()}`, null, {
            headers: { ...finalizeHeaders },
          });

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
}
