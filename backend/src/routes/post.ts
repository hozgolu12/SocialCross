import express from 'express';
import { body, validationResult } from 'express-validator';
import { Post } from '../models/Post';
import { SocialMediaService } from '../services/socialMediaService';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { Request, Response } from 'express';
import { adaptContent } from '../services/adaptationService';
import { cloudinary } from '../config/cloudinary';

const router = express.Router();

// Utility to upload a file to Cloudinary
const uploadToCloudinary = (file: Express.Multer.File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
        folder: 'socialcross'
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload failed.'));
        resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });
};

// Retry logic for Cloudinary upload
async function uploadToCloudinaryWithRetry(file: Express.Multer.File, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadToCloudinary(file);
    } catch (error: any) {
      lastError = error;
      if (error.code === 'ECONNRESET' && attempt < maxRetries) {
        console.warn(`Cloudinary upload failed (attempt ${attempt}), retrying...`);
        await new Promise(res => setTimeout(res, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

router.post('/', auth, upload.array('media', 4), [
  body('content').trim().isLength({ min: 0, max: 2000 }), // allow empty content
  body('platforms').isArray({ min: 1 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, platforms } = req.body;
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];
    const imageUrls: string[] = [];
    const videoUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const result = await uploadToCloudinaryWithRetry(file);
          if (result.resource_type === 'image') {
            imageUrls.push(result.secure_url);
          } else if (result.resource_type === 'video') {
            videoUrls.push(result.secure_url);
          }
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          // You might want to handle this more gracefully
          return res.status(500).json({ message: 'Error uploading files.' });
        }
      }
    }

    // Create post
    const post = new Post({
      userId,
      originalContent: content,
      images: imageUrls,
      videos: videoUrls,
      targetPlatforms: platforms,
      adaptedContent: []
    });

    // Use code-based adaptation for each platform
    for (const platform of platforms) {
      try {
        const adaptation = adaptContent(platform, content, { images: imageUrls, videos: videoUrls });

        post.adaptedContent.push({
          platform: platform as 'twitter' | 'telegram' | 'reddit',
          content: adaptation.content,
          hashtags: adaptation.hashtags,
          isApproved: false,
          publishStatus: 'pending',
          link: adaptation.link,
          image: adaptation.image,
          video: adaptation.video, 
          formattedContent: adaptation.formattedContent // for reddit
        });
      } catch (error) {
        console.error(`Adaptation error for ${platform}:`, error);
        post.adaptedContent.push({
          platform: platform as 'twitter' | 'telegram' | 'reddit',
          content: content,
          hashtags: [],
          isApproved: false,
          publishStatus: 'pending'
        });
      }
    }

    await post.save();

    res.status(201).json({
      message: 'Post created with platform adaptations',
      post
    });
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user posts - Fixed endpoint
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const posts = await Post.find({ userId }).sort({ createdAt: -1 });
    
    console.log(`Found ${posts.length} posts for user ${userId}`);
    
    res.json({ 
      posts: posts.map(post => ({
        _id: post._id,
        originalContent: post.originalContent,
        status: post.status || 'draft',
        createdAt: post.createdAt,
        adaptedContent: post.adaptedContent
      }))
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve adapted content
router.patch('/:postId/approve', auth, [
  body('platform').isIn(['twitter', 'telegram', 'reddit']),
  body('content').optional().trim().isLength({ min: 1 })
  ], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { postId } = req.params;
    console.log(req);
    const { platform, content } = req.body;
    const userId = req.user!.id;

    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const adaptedContent = post.adaptedContent.find(ac => ac.platform === platform);
    if (!adaptedContent) {
      return res.status(404).json({ message: 'Adapted content not found' });
    }

    adaptedContent.isApproved = true;
    if (content) {
      adaptedContent.content = content;
    }

    await post.save();

    res.json({
      message: 'Content approved',
      post
    });
  } catch (error) {
    console.error('Approve content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Publish post
router.post('/:postId/publish', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    console.log(postId)
    const userId = req.user!.id;
    console.log(userId)

    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const results = [];

    // Publish to each approved platform
    for (const adaptedContent of post.adaptedContent) {
      if (!adaptedContent.isApproved) continue;

      const socialAccount = user.socialAccounts.find(
        acc => acc.platform === adaptedContent.platform && acc.isActive
      );

      if (!socialAccount) {
        adaptedContent.publishStatus = 'failed';
        adaptedContent.errorMessage = 'Social account not connected';
        results.push({
          platform: adaptedContent.platform,
          success: false,
          error: 'Social account not connected'
        });
        continue;
      }

      try {
        const postData = {
          content: adaptedContent.content,
          images: post.images,
          videos: post.videos,
          hashtags: adaptedContent.hashtags
        };

        const publishResult = await SocialMediaService.publish(socialAccount, postData);

        adaptedContent.publishStatus = 'published';
        adaptedContent.publishedAt = new Date();
        results.push({
          platform: adaptedContent.platform,
          success: true,
          data: publishResult
        });
      } catch (error: any) {
        adaptedContent.publishStatus = 'failed';
        adaptedContent.errorMessage = error.message;
        results.push({
          platform: adaptedContent.platform,
          success: false,
          error: error.message
        });
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

    res.json({
      message: 'Publishing completed',
      results,
      post
    });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:postId', auth, async (req, res) => {
  const { postId } = req.params;

  try {
    const deletedPost = await Post.findByIdAndDelete(postId);
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }
    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
