import mongoose, { Document, Schema } from 'mongoose';

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
  userId: mongoose.Types.ObjectId;
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

const AdaptedContentSchema = new Schema<IAdaptedContent>({
  platform: {
    type: String,
    enum: ['twitter', 'telegram', 'reddit'],
    required: true
  },
  content: { type: String, required: true },
  hashtags: [String],
  isApproved: { type: Boolean, default: false },
  publishedAt: Date,
  publishStatus: {
    type: String,
    enum: ['pending', 'published', 'failed'],
    default: 'pending'
  },
  errorMessage: String,
  link: String,
  image: String,
  video: String, // <-- Add this
  formattedContent: String
});

const PostSchema = new Schema<IPost>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalContent: {
    type: String,
    required: true,
    maxlength: 2000
  },
  images: [String],
  videos: [String],
  targetPlatforms: [{
    type: String,
    enum: ['twitter', 'telegram', 'reddit']
  }],
  adaptedContent: [AdaptedContentSchema],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed'],
    default: 'draft'
  },
  scheduledAt: Date,
  publishedAt: Date
}, {
  timestamps: true
});

export const Post = mongoose.model<IPost>('Post', PostSchema);
