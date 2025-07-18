import express, { NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import { User } from '../models/User';
import { config } from '../config/config';
import { Request, Response } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { auth } from '../middleware/auth';
import { SocialMediaService } from '../services/socialMediaService';

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Create user
    const user = new User({ email, password, name });

    // Generate verification token and expiry (e.g., 3 days)
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    await user.save();

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
    await transporter.sendMail({
      to: user.email,
      subject: 'Verify your email for SocialCross',
      html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 3 days.</p>`,
    });

    res.status(201).json({
      message: 'User created successfully. Please check your email to verify your account.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  passport.authenticate('local', { session: false }, async function(err:any, user:any, info:any) {
    console.log(err, user, info);
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    }

    // Email verification check
    if (!user.emailVerified) {
      const now = new Date();
      if (!user.emailVerificationExpires || user.emailVerificationExpires < now) {
        return res.status(403).json({ message: 'Please verify your email to continue.' });
      }
      // else: allow login, but warn user in frontend
    }

    // Refresh expired tokens for all social accounts
    if (user.socialAccounts && user.socialAccounts.length > 0) {
      let updated = false;
      for (const acc of user.socialAccounts) {
        if (
          acc.platform === 'reddit' &&
          acc.tokenExpiry &&
          acc.tokenExpiry < new Date() &&
          acc.refreshToken
        ) {
          try {
            await SocialMediaService.refreshRedditToken(acc);
            updated = true;
            console.log(`Refreshed Reddit token for ${acc.username || acc.id}`);
          } catch (err) {
            acc.isActive = false;
            console.error(`Failed to refresh Reddit token for ${acc.username || acc.id}`);
          }
        }
        // Add similar logic for other platforms if needed
      }
      if (updated) {
        await user.save();
      }
    }

    const token = jwt.sign({ id: user._id }, config.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        socialAccounts: user.socialAccounts
      }
    });
  })(req, res, next);
});

// Verify Email
router.get('/verify-email', async (req, res) => {
  const { token, email } = req.query;

  // Try to find user by token and expiry
  let user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });

  if (user) {
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return res.json({ message: 'Email verified successfully' });
  }

  // If not found, try to find user by email who is already verified
  if (email) {
    user = await User.findOne({
      email: email.toString().toLowerCase(),
      emailVerified: true
    });
    if (user) {
      return res.json({ message: 'Email verified successfully' });
    }
  }

  return res.status(400).json({ message: 'Invalid or expired token' });
});

// Resend Verification Email
router.post('/resend-verification', auth, async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.emailVerified) return res.status(400).json({ message: 'Already verified' });

  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await user.save();

  // Send verification email
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
  await transporter.sendMail({
    to: user.email,
    subject: 'Verify your email for SocialCross',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 3 days.</p>`,
  });

  res.json({ message: 'Verification email resent' });
});

export default router;
