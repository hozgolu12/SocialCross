import mongoose, { Schema } from 'mongoose';
import { IAdaptedContent, IPost } from '../types';

const AdaptedContentSchema = new Schema<IAdaptedContent>({
  platform: {
    type: String,
    enum: ['twitter', 'telegram', 'reddit'],
    required: true
  },
  content: { type: String, required: false },
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
  video: String, 
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
    required: false,
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