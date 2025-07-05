import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import { ISocialAccount, PostData, IUser } from '../types';
import { User } from '../models/User';
import { config } from '../config/config';
import { Types } from 'mongoose';
import { TwitterApi } from './api/TwitterApi';
import { RedditApi } from './api/RedditApi';
import { TelegramApi } from './api/TelegramApi';

export class SocialMediaService {


  static async publishToTwitter(account: ISocialAccount, postData: PostData): Promise<any> {
    const twitterApi = new TwitterApi(account.accessToken, account.refreshToken as string);
    const allMedia = [
      ...(postData.images || []),
      ...(postData.videos || []),
    ];
    return twitterApi.post(postData.content, { media: allMedia });
  }
  static async publishToTelegram(account: ISocialAccount, postData: PostData): Promise<any> {
    const telegramApi = new TelegramApi(account.accessToken);
    const allMedia = [
      ...(postData.images || []),
      ...(postData.videos || []),
    ];
    return telegramApi.post(postData.content, { chatId: account.id, media: allMedia } as any);
  }

  static async publishToReddit(account: ISocialAccount, postData: PostData): Promise<any> {
    // Check if token needs refreshing
    if (account.tokenExpiry && new Date() > new Date(account.tokenExpiry)) {
      console.log('Reddit token expired, refreshing...');
      await SocialMediaService.refreshRedditToken(account);
    }

    const redditApi = new RedditApi(account.accessToken, account.refreshToken as string);
    const allMedia = [
      ...(postData.images || []),
      ...(postData.videos || []),
    ];
    return redditApi.post(postData.content, { subreddit: account.subredditName as string, media: allMedia });
  }

  static async getUserProfile(platform: string, account: ISocialAccount): Promise<any> {
    switch (platform) {
      case 'twitter':
        const twitterApi = new TwitterApi(account.accessToken, account.refreshToken as string);
        return twitterApi.getUserProfile(account.id);
      case 'reddit':
        // Check if token needs refreshing before fetching profile
        if (account.tokenExpiry && new Date() > new Date(account.tokenExpiry)) {
          console.log('Reddit token expired, refreshing...');
          await SocialMediaService.refreshRedditToken(account);
        }
        const redditApi = new RedditApi(account.accessToken, account.refreshToken as string);
        return redditApi.getUserProfile(account.username);
      case 'telegram':
        const telegramApi = new TelegramApi(account.accessToken);
        return telegramApi.getUserProfile();
      default:
        throw new Error('Unsupported platform');
    }
  }

  static async refreshRedditToken(account: ISocialAccount): Promise<any> {
    try {
      const redditApi = new RedditApi(account.accessToken, account.refreshToken as string);
      const newAccessToken = await redditApi.refreshToken(); // Capture the returned token

      // Find the user and update the specific social account
      const user = await User.findOne({ 'socialAccounts._id': account._id });
      if (user) {
        const socialAccountIndex = user.socialAccounts.findIndex(acc => acc._id?.equals(account._id as Types.ObjectId));
        if (socialAccountIndex !== -1) {
          user.socialAccounts[socialAccountIndex].accessToken = newAccessToken; // Use the new token
          // Reddit tokens typically expire in 1 hour (3600 seconds)
          user.socialAccounts[socialAccountIndex].tokenExpiry = new Date(Date.now() + 3600 * 1000);
          await user.save();
          console.log('Reddit token refreshed and saved to DB.');
        }
      }
    } catch (error: any) {
      console.error('Error refreshing Reddit token and saving to DB:', error);
      throw new Error('Failed to refresh Reddit token and save to DB.');
    }
  }

  
}