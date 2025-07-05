import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../models/User';
import { config } from './config';
import bcrypt from 'bcryptjs';
import { TwitterApi } from '../services/api/TwitterApi';

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
    passport.use(TwitterApi.getPassportStrategy(User, config));
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