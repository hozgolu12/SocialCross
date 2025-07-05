import express from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import { TwitterApi } from '../services/api/TwitterApi';
import { TelegramApi } from '../services/api/TelegramApi';
import { RedditApi } from '../services/api/RedditApi';
import { SocialMediaService } from '../services/socialMediaService';

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

    let totalAudienceSize = 0;
    const details: any[] = [];

    for (const acc of user.socialAccounts) {
      let audienceSize = 0;
      let engagement: any = {}; // Initialize engagement object
      const platform = acc.platform.toLowerCase();

      try {
        if (platform === 'twitter') {
          const twitterApi = new TwitterApi(acc.accessToken, acc.refreshToken as string);
          const profile = await twitterApi.getUserProfile(acc.id);
          audienceSize = profile.followers_count;
          engagement = await twitterApi.getRecentTweetsEngagement(acc.id);
        } else if (platform === 'telegram') {
          const telegramApi = new TelegramApi(acc.accessToken);
          audienceSize = await telegramApi.getChatMembersCount(acc.id);
        } else if (platform === 'reddit') {
          // Ensure token is refreshed before fetching subreddit subscribers
          if (acc.tokenExpiry && new Date() > new Date(acc.tokenExpiry)) {
            await SocialMediaService.refreshRedditToken(acc);
          }
          const redditApi = new RedditApi(acc.accessToken, acc.refreshToken as string);
          if (acc.subredditName) {
            audienceSize = await redditApi.getSubredditSubscribers(acc.subredditName);
          } else {
            // If no subredditName, try to get user's own follower count (if applicable, or default to 0)
            const userProfile = await redditApi.getUserProfile(acc.username);
            audienceSize = userProfile.total_karma; // Example: using total_karma as a proxy for 'reach'
          }
        }
      } catch (err: any) {
        console.warn(`API error for ${platform} account ${acc.username || acc.id}:`, err?.response?.data || err.message);
        // Fallback to stored count if API call fails
        if (platform === 'twitter') audienceSize = acc.followersCount || 0;
        else if (platform === 'telegram') audienceSize = acc.memberCount || 0;
        else if (platform === 'reddit') audienceSize = acc.subscribers || 0;
      }

      totalAudienceSize += audienceSize;
      details.push({
        platform: acc.platform,
        username: acc.platform === 'reddit' ? acc.subredditName : acc.username,
        audienceSize,
        engagement,
      });
    }

    return res.json({ totalAudienceSize, details });
  } catch (err) {
    console.error('Reach fetch error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message: 'Failed to fetch reach', error: errorMessage });
  }
});

export default router;