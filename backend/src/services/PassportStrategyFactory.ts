
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { User } from '../models/User';
import { config } from '../config/config';
import bcrypt from 'bcryptjs';
import { TwitterApi } from './api/TwitterApi';

export class PassportStrategyFactory {
  static createLocalStrategy(): LocalStrategy {
    return new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
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
    });
  }

  static createJwtStrategy(): JwtStrategy {
    return new JwtStrategy({
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
    });
  }

  static createTwitterStrategy(): TwitterStrategy | null {
    if (config.TWITTER_CLIENT_ID && config.TWITTER_CLIENT_SECRET) {
      return TwitterApi.getPassportStrategy(User, config);
    }
    return null;
  }
}
