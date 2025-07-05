import express from 'express';
import passport from 'passport';
import { User } from '../models/User';
import { config } from '../config/config';
import { auth } from '../middleware/auth';
import { TelegramApi } from '../services/api/TelegramApi';
import { RedditApi } from '../services/api/RedditApi';
import { TwitterApi } from '../services/api/TwitterApi';

const router = express.Router();

// src/types/express-session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    redditState?: string;
  }
}


// Twitter OAuth
router.get('/twitter', (req, res, next) => {
  const userId = req.query.userId as string;
  
  console.log('Twitter OAuth initiation - User ID from query:', userId);
  
  if (!userId) {
    console.error('Missing user ID in Twitter OAuth request');
    return res.redirect(`${config.FRONTEND_URL}/accounts?error=missing_user_id`);
  }
  
  req.session.userId = userId;
  console.log('Stored userId in session:', userId);
  
  passport.authenticate('twitter')(req, res, next);
});

router.get('/twitter/callback', passport.authenticate('twitter', { session: false }), 
  async (req, res) => {
    try {
      const profile = req.user as any;
      const userId = req.session.userId;
      
      console.log('Twitter callback - Profile:', JSON.stringify(profile, null, 2));
      console.log('Twitter callback - User ID from session:', userId);
      
      if (!userId) {
        console.error('Missing user ID in Twitter callback session');
        return res.redirect(`${config.FRONTEND_URL}/accounts?error=missing_user_id`);
      }

      // The user object returned by Passport's deserializeUser (if successful) or the result from handleOAuthCallback
      // should contain the updated user or the profile data for a new user.
      // We need to check if req.user is a full user object or the temporary profile data.
      if (profile && profile.profile && profile.token && profile.tokenSecret) {
        // This means it's the temporary profile data from passport.ts for a new user
        // This case should ideally be handled by passport.ts if a new user needs to be created
        // For now, we'll redirect with an error as this flow expects an existing user.
        console.error('Twitter callback: New user detected in OAuth callback, but expected existing user.');
        return res.redirect(`${config.FRONTEND_URL}/accounts?error=twitter_new_user_unhandled`);
      }

      // If we reach here, it means req.user is likely the full user object from deserializeUser
      // or the handleOAuthCallback successfully updated an existing user.
      delete req.session.userId;

      res.redirect(`${config.FRONTEND_URL}/accounts?connected=twitter`);
    } catch (error) {
      console.error('Twitter OAuth callback error:', error);
      res.redirect(`${config.FRONTEND_URL}/accounts?error=twitter_connection_failed`);
    }
  }
);

// Telegram OAuth - Bot setup
router.get('/telegram', async (req, res) => {
  const userId = req.query.userId as string;
  const botToken = req.query.botToken as string;
  const channelId = req.query.channelId as string;
  
  console.log('Telegram OAuth initiation - User ID:', userId);
  
  if (!userId) {
    return res.redirect(`${config.FRONTEND_URL}/accounts?error=missing_user_id`);
  }
  
  if (!botToken || !channelId) {
    // Redirect to a setup page where user can enter bot token and channel ID
    return res.redirect(`${config.FRONTEND_URL}/accounts/telegram-setup?userId=${userId}`);
  }
  
  try {
    const telegramApi = new TelegramApi(botToken);
    const botInfo = await telegramApi.getUserProfile(); // Use the new method
    
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${config.FRONTEND_URL}/accounts?error=user_not_found`);
    }
    
    // Add or update Telegram account
    const existingAccountIndex = user.socialAccounts.findIndex(
      acc => acc.platform === 'telegram'
    );

    const telegramAccount = {
      platform: 'telegram' as const,
      id: channelId,
      username: botInfo.username,
      accessToken: botToken,
      isActive: true,
      connectedAt: new Date()
    };

    if (existingAccountIndex >= 0) {
      user.socialAccounts[existingAccountIndex] = telegramAccount;
    } else {
      user.socialAccounts.push(telegramAccount);
    }

    await user.save();
    res.redirect(`${config.FRONTEND_URL}/accounts?connected=telegram`);
  } catch (error) {
    console.error('Telegram setup error:', error);
    res.redirect(`${config.FRONTEND_URL}/accounts?error=telegram_connection_failed`);
  }
});

// Reddit OAuth
router.get('/reddit', (req, res) => {
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.redirect(`${config.FRONTEND_URL}/accounts?error=missing_user_id`);
  }
  
  req.session.userId = userId;
  const state = `${userId}_${Date.now()}`;
  req.session.redditState = state;
  
  const authUrl = RedditApi.getAuthUrl(state); // Use the new static method
  res.redirect(authUrl);
});

router.get('/reddit/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const userId = req.session.userId;
    const sessionState = req.session.redditState;
    
    if (error) {
      return res.redirect(`${config.FRONTEND_URL}/accounts?error=reddit_auth_denied`);
    }
    
    if (!userId || !sessionState || state !== sessionState) {
      return res.redirect(`${config.FRONTEND_URL}/accounts?error=invalid_state`);
    }
    
    // Exchange code for access token and get user info using RedditApi
    const tokenData = await RedditApi.exchangeCodeForTokens(code as string);
    const redditUser = await RedditApi.getUserInfo(tokenData.access_token);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${config.FRONTEND_URL}/accounts?error=user_not_found`);
    }
    
    // Add or update Reddit account
    const existingAccountIndex = user.socialAccounts.findIndex(
      acc => acc.platform === 'reddit'
    );

    const redditAccount = {
      platform: 'reddit' as const,
      id: redditUser.id,
      username: redditUser.name,
      subredditName: req.body.subredditName || '', // <-- store subreddit name
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
      isActive: true,
      connectedAt: new Date()
    };

    if (existingAccountIndex >= 0) {
      user.socialAccounts[existingAccountIndex] = redditAccount;
    } else {
      user.socialAccounts.push(redditAccount);
    }

    await user.save();
    
    // Clear session data
    delete req.session.userId;
    delete req.session.redditState;
    
    res.redirect(`${config.FRONTEND_URL}/accounts/reddit-setup`);
  } catch (error) {
    console.error('Reddit OAuth callback error:', error);
    res.redirect(`${config.FRONTEND_URL}/accounts?error=reddit_connection_failed`);
  }
});

// Update subreddit name
router.post('/reddit/subreddit', auth, async (req, res) => {
  const { subredditName } = req.body;
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const redditAcc = user.socialAccounts.find(acc => acc.platform === 'reddit');
  if (!redditAcc) return res.status(400).json({ message: 'Reddit account not connected' });
  redditAcc.subredditName = subredditName;
  await user.save();
  res.json({ message: 'Subreddit name saved' });
});

// Disconnect social account
router.delete('/disconnect/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const userId = req.user!.id;

    console.log('Disconnecting platform:', platform, 'for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.socialAccounts = user.socialAccounts.filter(
      acc => acc.platform !== platform
    );

    await user.save();
    console.log('Platform disconnected successfully');

    res.json({
      message: `${platform} account disconnected successfully`,
      socialAccounts: user.socialAccounts.map(acc => ({
        platform: acc.platform,
        username: acc.username,
        isActive: acc.isActive,
        connectedAt: acc.connectedAt
      }))
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;