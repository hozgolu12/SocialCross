
import express from 'express';
import { User } from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// Get connected social accounts
router.get('/accounts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const accounts = user.socialAccounts.map(acc => ({
      platform: acc.platform,
      username: acc.username,
      isActive: acc.isActive,
      connectedAt: acc.connectedAt
    }));

    res.json({ accounts });
  } catch (error) {
    console.error('Get social accounts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle social account status
router.patch('/accounts/:platform/toggle', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const userId = req.user!.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const account = user.socialAccounts.find(acc => acc.platform === platform);
    if (!account) {
      return res.status(404).json({ message: 'Social account not found' });
    }

    account.isActive = !account.isActive;
    await user.save();

    res.json({
      message: `${platform} account ${account.isActive ? 'activated' : 'deactivated'}`,
      account: {
        platform: account.platform,
        username: account.username,
        isActive: account.isActive,
        connectedAt: account.connectedAt
      }
    });
  } catch (error) {
    console.error('Toggle account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
