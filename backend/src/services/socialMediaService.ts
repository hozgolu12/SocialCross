
import { ISocialAccount, PostData, IUser } from '../types';
import { User } from '../models/User';
import { Types } from 'mongoose';
import { SocialMediaApiFactory } from './SocialMediaApiFactory';
import { RedditApi } from './api/RedditApi';

export class SocialMediaService {

  static async publish(account: ISocialAccount, postData: PostData): Promise<any> {
    if (account.platform === 'reddit' && account.tokenExpiry && new Date() > new Date(account.tokenExpiry)) {
      console.log('Reddit token expired, refreshing...');
      await this.refreshRedditToken(account);
    }

    const api = SocialMediaApiFactory.createApi(account);
    const allMedia = [...(postData.images || []), ...(postData.videos || [])];
    
    let options: any = { media: allMedia };
    if (account.platform === 'telegram') {
      options.chatId = account.id;
    } else if (account.platform === 'reddit') {
      options.subreddit = account.subredditName;
    }

    return api.post(postData.content, options);
  }

  static async getUserProfile(account: ISocialAccount): Promise<any> {
    if (account.platform === 'reddit' && account.tokenExpiry && new Date() > new Date(account.tokenExpiry)) {
      console.log('Reddit token expired, refreshing...');
      await this.refreshRedditToken(account);
    }

    const api = SocialMediaApiFactory.createApi(account);
    const identifier = account.platform === 'twitter' ? account.id : account.username;
    return api.getUserProfile(identifier);
  }


  static async getReachStats(account: ISocialAccount): Promise<{ audience: number; engagement?: any }> {
    const api = SocialMediaApiFactory.createApi(account);
    let options: any = {};
    if (account.platform === 'telegram') {
      options.chatId = account.id;
    } else if (account.platform === 'reddit') {
      options.subredditName = account.subredditName;
      options.username = account.username;
    }
    return api.getReachStats(options);
  }

static async refreshRedditToken(account: ISocialAccount): Promise<void> {
    try {
      const redditApi = new RedditApi(account.accessToken, account.refreshToken as string);
      const newAccessToken = await redditApi.refreshToken();

      const user = await User.findOne({ 'socialAccounts._id': account._id });
      if (user) {
        const socialAccountIndex = user.socialAccounts.findIndex(acc => acc._id?.equals(account._id as Types.ObjectId));
        if (socialAccountIndex !== -1) {
          user.socialAccounts[socialAccountIndex].accessToken = newAccessToken;
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