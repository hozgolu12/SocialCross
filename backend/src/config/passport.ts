
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from './config';


export const getRedditAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: config.REDDIT_CLIENT_ID!,
    response_type: 'code',
    state: state,
    redirect_uri: config.REDDIT_CALLBACK_URL!,
    duration: 'permanent',
    scope: 'identity submit read'
  });
  
  return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
};

export const exchangeRedditCode = async (code: string) => {
  const auth = Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString('base64');
  
  const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.REDDIT_CALLBACK_URL!
    }), {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': config.REDDIT_USER_AGENT
      }
    }
  );
  
  return response.data;
};

export const getRedditUser = async (accessToken: string) => {
  const response = await axios.get('https://oauth.reddit.com/api/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': config.REDDIT_USER_AGENT
    }
  });
  
  return response.data;
};

export const initializePassport = () => {
  // Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, user as any);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.JWT_SECRET
  }, async (payload, done) => {
    try {
      const user = await User.findById(payload.id);
      if (user) {
        return done(null, user as any);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Twitter Strategy
  if (config.TWITTER_CLIENT_ID && config.TWITTER_CLIENT_SECRET) {
    passport.use(new TwitterStrategy({
      consumerKey: config.TWITTER_CLIENT_ID,
      consumerSecret: config.TWITTER_CLIENT_SECRET,
      callbackURL: config.TWITTER_CALLBACK_URL ?? '/auth/twitter/callback'
    }
    , async (token, tokenSecret, profile, done) => {
      try {
        const user = await User.findOne({ 'socialAccounts.twitter.id': profile.id });
        if (user) {
          // Update tokens
          const twitterAccount = user.socialAccounts.find(acc => acc.platform === 'twitter');
          if (twitterAccount) {
            twitterAccount.accessToken =token;
            twitterAccount.refreshToken = tokenSecret;
            await user.save();
          }
          return done(null, user);
        }
        return done(null, {
          profile,
          token,
          tokenSecret
        });
      } catch (error) {
        return done(error);
      }
    }));
  }
  passport.serializeUser((id, done) => {
    // Only serialize what you need (like an ID)
    done(null, id); 
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      return done(null, user as any);
    } catch (err) {
      return done(err);
    }
  });

};
