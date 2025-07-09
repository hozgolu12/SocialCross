import passport from 'passport';
import { User } from '../models/User';
import { PassportStrategyFactory } from '../services/PassportStrategyFactory';

export const initializePassport = () => {
  passport.use(PassportStrategyFactory.createLocalStrategy());
  passport.use(PassportStrategyFactory.createJwtStrategy());

  const twitterStrategy = PassportStrategyFactory.createTwitterStrategy();
  if (twitterStrategy) {
    passport.use(twitterStrategy);
  }

  passport.serializeUser((user, done) => {
    done(null, (user as any).id);
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