
import { ISocialAccount, ISocialMediaApi } from '../types';
import { TwitterApi } from './api/TwitterApi';
import { RedditApi } from './api/RedditApi';
import { TelegramApi } from './api/TelegramApi';

export class SocialMediaApiFactory {
  static createApi(account: ISocialAccount): ISocialMediaApi {
    switch (account.platform) {
      case 'twitter':
        if (!account.refreshToken) {
          throw new Error('Twitter account requires both access token and refresh token.');
        }
        return new TwitterApi(account.accessToken, account.refreshToken);
      case 'reddit':
        if (!account.refreshToken) {
          throw new Error('Reddit account requires both access token and refresh token.');
        }
        return new RedditApi(account.accessToken, account.refreshToken);
      case 'telegram':
        return new TelegramApi(account.accessToken);
      default:
        throw new Error(`Unsupported platform: ${account.platform}`);
    }
  }
}
