import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ISocialAccount, IUser } from '../types';

const SocialAccountSchema = new Schema<ISocialAccount>({
  platform: {
    type: String,
    enum: ['twitter', 'telegram', 'reddit'],
    required: true
  },
  id: { type: String, required: true },
  username: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: String,
  tokenExpiry: Date,
  isActive: { type: Boolean, default: true },
  connectedAt: { type: Date, default: Date.now },
  followersCount: { type: Number, default: 0 },
  memberCount: { type: Number, default: 0 },
  subscribers: { type: Number, default: 0 },
  subredditName: { type: String }
});

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: String,
  socialAccounts: [SocialAccountSchema],
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date }
}, {
  timestamps: true
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);