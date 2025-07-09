
export interface SocialAccount {
  platform: 'twitter' | 'telegram' | 'reddit';
  username: string;
  isActive: boolean;
  connectedAt: Date;
  subredditName?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  socialAccounts: SocialAccount[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReachData {
  totalAudienceSize: number;
  details: {
    platform: string;
    username: string;
    audienceSize: number;
    engagement?: {
      likes?: number;
      retweets?: number;
      replies?: number;
      memberCount?: number;
      karma?: number;
    };
  }[];
}

export interface Post {
  _id: string;
  originalContent: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  createdAt: Date;
  adaptedContent: {
    platform: string;
    content: string;
    isApproved: boolean;
    publishStatus: string;
  }[];
}
