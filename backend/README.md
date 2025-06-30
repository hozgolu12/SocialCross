
# Social Media Cross-Posting Backend

A comprehensive Node.js backend for cross-posting content to multiple social media platforms with AI-powered content adaptation.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **OAuth Integration**: Connect Twitter, Facebook, and Instagram accounts
- **AI Content Adaptation**: OpenAI GPT-4 powered content optimization for each platform
- **Multi-Platform Publishing**: Automated posting to Twitter, Facebook, and Instagram
- **Image Upload**: Cloudinary integration for image handling
- **Post Scheduling**: Redis + BullMQ for scheduling posts
- **Content Preview**: Preview adapted content before publishing
- **Error Handling**: Comprehensive error handling and logging

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Passport.js
- **AI**: OpenAI GPT-4 API
- **File Upload**: Multer + Cloudinary
- **Job Queue**: Redis + BullMQ
- **Social APIs**: Twitter API v2, Facebook Graph API, Instagram Graph API

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

### Facebook Graph API
1. Create a Facebook Developer account
2. Create a new Facebook app
3. Add Facebook Login product
4. Configure OAuth redirect URIs
5. Request permissions: `pages_manage_posts`, `pages_read_engagement`

### Instagram Business API
1. Use Facebook Graph API (Instagram is owned by Facebook)
2. Connect Instagram Business account to Facebook Page
3. Request permissions: `instagram_basic`, `instagram_content_publish`

## Content Adaptation

The AI service automatically adapts content for each platform:

- **Twitter**: 280 character limit, conversational tone, relevant hashtags
- **Facebook**: Professional tone, longer content allowed, engagement focus
- **Instagram**: Visual-first, emojis, lifestyle hashtags, image-centric

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

## License

MIT License - see LICENSE file for details
