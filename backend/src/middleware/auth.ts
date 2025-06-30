
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
    }
  }
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Access denied. No valid token provided.' });
    }
    
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    };
    
    next();
  })(req, res, next);
};
