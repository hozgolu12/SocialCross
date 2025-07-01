
# Social Media Cross-Posting App

A comprehensive Nodejs app for cross-posting content to multiple social media platforms with AI-powered content adaptation.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **OAuth Integration**: Connect Twitter, Facebook, and Instagram accounts
- **AI**: OpenAI GPT-4 powered content creation for each platform
- **Content Adaptation**: Adaptor for content optimization and adaptation for each platform
- **Multi-Platform Publishing**: Automated posting to Twitter, Facebook, and Instagram
- **Image & Video Upload**: Upload and preview images and videos (Cloudinary integration)
- **Reach Analytics**: View follower/subscriber counts for connected accounts
- **Post Scheduling**: Redis + BullMQ for scheduling posts
- **Content Preview**: Preview adapted content before publishing
- **Error Handling**: Comprehensive error handling and logging
- **Content Preview**: Preview adapted content before publishing
- **Responsive UI**: Built with React and Tailwind CSS.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Vite React + TailwindCss + Typescript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Passport.js
- **AI**: OpenAI GPT-4 API
- **File Upload**: Multer + Cloudinary
- **Job Queue**: Redis + BullMQ
- **Social APIs**: Twitter API v2, Facebook Graph API, Instagram Graph API

## Content Adaptation
**Content is adapted for each platform using custom logic:**

- **Twitter**: Trims to 280 characters, adds hashtags, shortens links.
- **Telegram**: Adds emojis, supports images/videos, and hashtags.
- **Reddit**: Formats content in Markdown, includes links and images.


## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - MongoDB connection string
   - JWT secret
   - OpenAI API key
   - Social media app credentials
   - Cloudinary credentials
   - Redis URL

5. Start the development server:
```bash
npm run dev
```
6. Start the development client:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Posts
- `POST /api/posts` - Create post with AI adaptation
- `GET /api/posts` - Get user posts
- `PATCH /api/posts/:id/approve` - Approve adapted content
- `POST /api/posts/:id/publish` - Publish post

### Social Accounts
- `GET /api/social/accounts` - Get connected accounts
- `PATCH /api/social/accounts/:platform/toggle` - Toggle account status

### OAuth
- `GET /auth/twitter` - Twitter OAuth
- `GET /auth/facebook` - Facebook OAuth
- `DELETE /auth/disconnect/:platform` - Disconnect account

### User
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update profile

## Environment Variables

See `.env.example` for all required environment variables.

## Social Media Setup

### Twitter (X) API v2
1. Create a Twitter Developer account
2. Create a new app in the Twitter Developer Portal
3. Generate API keys and tokens
4. Set up OAuth 2.0 with PKCE

### Telegram Bot API
1. Create a Telegram account
2. Chat with the BotFather bot to create a new bot
3. Get the bot token from BotFather
4. Use the Telegram Bot API endpoints with your bot token to send and receive messages

### Reddit API (OAuth 2.0)
1. Create a Reddit account
2. Go to Reddit App Preferences
3. Create a new app (choose script, web, or installed app)
4. Get the client ID and client secret
5. Implement OAuth 2.0 to get access tokens for API calls

## Content Adaptation

The AI service automatically adapts content for each platform:

- **Twitter**: 280 character limit, conversational tone, relevant hashtags
- **Telegram: Direct messaging style, real-time updates, supports rich media (images, buttons, polls), great for communities and broadcasts, no algorithmic feed
- **Reddit: Forum-style content, text or media posts, subreddit-specific culture, upvotes/downvotes drive visibility, detailed discussions preferred over short-form


## Scheduling

Posts can be scheduled using the BullMQ job queue:

```typescript
import { schedulePost } from './jobs/postScheduler';

// Schedule a post for later
await schedulePost(postId, new Date('2024-01-01T10:00:00Z'));
```

## Error Handling

The application includes comprehensive error handling:
- Validation errors
- Authentication errors  
- Social media API errors
- File upload errors
- Database errors

## Security Features

- Helmet.js for security headers
- Rate limiting
- CORS configuration
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization

## Testing

Run tests with:
```bash
npm test
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. Ensure all environment variables are properly set
4. Set up SSL/TLS certificates
5. Configure reverse proxy (nginx recommended)
6. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
