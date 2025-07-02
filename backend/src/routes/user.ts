import express from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import axios from 'axios';
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import { config } from '../config/config';

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      socialAccounts: user.socialAccounts.map(acc => ({
        platform: acc.platform,
        username: acc.username,
        subredditName: acc.subredditName, // <-- Add this
        isActive: acc.isActive,
        connectedAt: acc.connectedAt
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user!.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      socialAccounts: user.socialAccounts.map(acc => ({
        platform: acc.platform,
        username: acc.username,
        subredditName: acc.subredditName, // <-- Add this
        isActive: acc.isActive,
        connectedAt: acc.connectedAt
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reach stats
router.get('/reach', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let totalReach = 0;
    const details: any[] = [];

    for (const acc of user.socialAccounts) {
      let followers = 0;
      const platform = acc.platform.toLowerCase();

      // 🐦 Twitter (OAuth 1.0a)
      if (platform === 'twitter' && acc.id && acc.accessToken && acc.refreshToken) {
        try {
          const oauth = new OAuth({
            consumer: {
              key: config.TWITTER_CLIENT_ID as string,
              secret: config.TWITTER_CLIENT_SECRET as string,
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string, key) {
              return crypto.createHmac('sha1', key).update(base_string).digest('base64');
            },
          });

          const token = {
            key: acc.accessToken,
            secret: acc.refreshToken,
          };

          const url = `https://api.twitter.com/2/users/${acc.id}?user.fields=public_metrics`;
          const request_data = {
            url,
            method: 'GET',
          };

          const headersObj = oauth.toHeader(oauth.authorize(request_data, token));
          const headers = { ...headersObj };

          const resp = await axios.get(url, { headers });
          followers = resp.data.followers_count;
          console.log(resp.data);
        } catch (err: any) {
          console.warn(`Twitter API error for ${acc.username}:`, err?.response?.data || err.message);
        }
      }

      // 📢 Telegram (live fetch if accessToken & username, else fallback)
      else if (platform === 'telegram') {
        if (acc.accessToken && acc.id) {
          try {
            const resp = await axios.get(
              `https://api.telegram.org/bot${acc.accessToken}/getChatMembersCount?chat_id=${acc.id}`
            );
            if (resp.data.ok) {
              followers = resp.data.result;
            }
            console.log(resp.data);
          } catch (err: any) {
            console.warn(`Telegram API error for ${acc.username}:`, err?.response?.data || err.message);
            followers = acc.memberCount || 0;
          }
        } else {
          followers = acc.memberCount || 0;
        }
      }

      // 👽 Reddit (fetch subreddit subscribers)
      else if (platform === 'reddit') {
        // Check token expiry before making API call
        if (acc.tokenExpiry && acc.tokenExpiry < new Date()) {
          acc.isActive = false;
          await user.save();
          followers = acc.subscribers || 0;
        } else if (acc.subredditName) {
          try {
            const resp = await axios.get(
              `https://www.reddit.com/r/${acc.subredditName}/about.json`,
              { headers: { 'User-Agent': 'SocialCrossPost/1.0' } }
            );
            followers = resp.data.data.subscribers;
            console.log(resp.data);
          } catch (err: any) {
            console.warn(`Reddit API error for ${acc.subredditName}:`, err?.response?.data || err.message);
            if (err.response?.status === 401) {
              acc.isActive = false;
              await user.save();
            }
            followers = acc.subscribers || 0;
          }
        } else {
          followers = acc.subscribers || 0;
        }
      }

      totalReach += followers;
      details.push({
        platform: acc.platform,
        username: acc.platform === 'reddit' ? acc.subredditName : acc.username, // Show subreddit name for Reddit
        followers,
      });
    }

    return res.json({ totalReach, details });
  } catch (err) {
    console.error('Reach fetch error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message: 'Failed to fetch reach', error: errorMessage });
  }
});

export default router;
