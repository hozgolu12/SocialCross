import express from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
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
      let engagement: any = {};

      try {
        const stats = await SocialMediaService.getReachStats(acc);
        audienceSize = stats.audience;
        engagement = stats.engagement;
      } catch (err: any) {
        console.warn(`API error for ${acc.platform} account ${acc.username || acc.id}:`, err?.response?.data || err.message);
        // Fallback to stored count if API call fails
        if (acc.platform === 'twitter') audienceSize = acc.followersCount || 0;
        else if (acc.platform === 'telegram') audienceSize = acc.memberCount || 0;
        else if (acc.platform === 'reddit') audienceSize = acc.subscribers || 0;
      }

      totalAudienceSize += audienceSize;
      const username = acc.platform === 'reddit'
        ? acc.subredditName
        : acc.platform === 'telegram'
          ? 'Telegram Members'
          : acc.username;

      details.push({
        platform: acc.platform,
        username: username,
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