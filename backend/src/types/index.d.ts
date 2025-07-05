
declare module 'mongoose' {
  interface Document {
    _id?: import('mongoose').Types.ObjectId;
  }
}

export interface IAdaptedContent {
  platform: 'twitter' | 'telegram' | 'reddit';
  content: string;
  hashtags?: string[];
  isApproved: boolean;
  publishedAt?: Date;
  publishStatus: 'pending' | 'published' | 'failed';
  errorMessage?: string;
  link?: string;
  image?: string;
  video?: string; 
  formattedContent?: string;
  explanation?: string;
}

export interface IPost extends Document {
  userId: import('mongoose').Types.ObjectId;
  originalContent: string;
  images: string[];
  videos: string[];
  targetPlatforms: string[];
  adaptedContent: IAdaptedContent[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialAccount {
  platform: 'twitter' | 'telegram' | 'reddit';
  id: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  isActive: boolean;
  connectedAt: Date;
  followersCount?: number;   // Twitter, Instagram, etc.
  memberCount?: number;      // Telegram groups/channels
  subscribers?: number;      // Reddit subreddits
  subredditName?: string;
  _id?: import('mongoose').Types.ObjectId; // Add _id for Mongoose documents
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  socialAccounts: ISocialAccount[];
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface AdaptedContent {
  content: string;
  hashtags: string[];
  explanation: string;
  link?: string;
  image?: string;
  video?: string; 
  formattedContent?: string;
}

export interface ISocialMediaApi {
  post(content: string, options?: any): Promise<any>;
  getPost(id: string): Promise<any>;
  deletePost(id: string): Promise<void>;
  getUserProfile(identifier?: string): Promise<any>;
}

export interface PostData {
  content: string;
  images?: string[];
  hashtags?: string[];
  videos?: string[]; // Added videos field
}
