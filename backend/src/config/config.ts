
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/social-crosspost',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Python Microservice
  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || 'http://localhost:5001',
  
  // Twitter API 
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
  TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
  TWITTER_CALLBACK_URL: process.env.TWITTER_CALLBACK_URL || 'http://localhost:5000/api/oauth/twitter/callback',
  
  // Telegram Bot API
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  
  // Reddit API
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
  REDDIT_USER_AGENT: process.env.REDDIT_USER_AGENT || 'SocialCrossPost/1.0',
  REDDIT_CALLBACK_URL: process.env.REDDIT_CALLBACK_URL || 'http://localhost:5000/api/oauth/reddit/callback',
};
