
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { SocialMediaService } from '../services/socialMediaService';
import { config } from '../config/config';

const redis = new Redis(config.REDIS_URL);

// Create queue for scheduled posts
export const postQueue = new Queue('post-publishing', { connection: redis });

// Define job processor
const worker = new Worker('post-publishing', async (job) => {
  const { postId } = job.data;
  
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const user = await User.findById(post.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Publish to each approved platform
    for (const adaptedContent of post.adaptedContent) {
      if (!adaptedContent.isApproved) continue;

      const socialAccount = user.socialAccounts.find(
        acc => acc.platform === adaptedContent.platform && acc.isActive
      );

      if (!socialAccount) {
        adaptedContent.publishStatus = 'failed';
        adaptedContent.errorMessage = 'Social account not connected';
        continue;
      }

      try {
        const postData = {
          content: adaptedContent.content,
          images: post.images,
          hashtags: adaptedContent.hashtags
        };

        switch (adaptedContent.platform) {
          case 'twitter':
            await SocialMediaService.publishToTwitter(socialAccount, postData);
            break;
          case 'telegram':
            await SocialMediaService.publishToTelegram(socialAccount, postData);
            break;
          case 'reddit':
            await SocialMediaService.publishToReddit(socialAccount, postData);
            break;
        }

        adaptedContent.publishStatus = 'published';
        adaptedContent.publishedAt = new Date();
      } catch (error: any) {
        adaptedContent.publishStatus = 'failed';
        adaptedContent.errorMessage = error.message;
      }
    }

    // Update post status
    const allPublished = post.adaptedContent.every(ac => 
      !ac.isApproved || ac.publishStatus === 'published'
    );
    const anyFailed = post.adaptedContent.some(ac => 
      ac.isApproved && ac.publishStatus === 'failed'
    );

    if (allPublished && !anyFailed) {
      post.status = 'published';
      post.publishedAt = new Date();
    } else if (anyFailed) {
      post.status = 'failed';
    }

    await post.save();

    return { success: true, postId };
  } catch (error) {
    console.error('Scheduled post processing error:', error);
    throw error;
  }
}, { connection: redis });

// Schedule a post
export const schedulePost = async (postId: string, scheduledAt: Date) => {
  const delay = scheduledAt.getTime() - Date.now();
  
  if (delay <= 0) {
    throw new Error('Scheduled time must be in the future');
  }

  await postQueue.add('publish-post', { postId }, {
    delay,
    jobId: `post-${postId}`
  });
};

// Cancel scheduled post
export const cancelScheduledPost = async (postId: string) => {
  const job = await postQueue.getJob(`post-${postId}`);
  if (job) {
    await job.remove();
  }
};

export default worker;
