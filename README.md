# SocialCross

**SocialCross** is a full-stack platform for cross-posting content to multiple social media platforms with AI-powered content creation, Content adaptation, Scheduling, and Reach analytics.

---

## Features

- **User Authentication**: Secure JWT-based authentication.
- **Email Verification System**: Verify whether the email is used by user or not.
- **OAuth Integration**: Connect Twitter, Telegram, and Reddit accounts.
- **AI Content Generation**: Use OpenAI to generate post content from prompts.
- **Content Adaptation**: Automatically adapt content for each platform (Twitter, Telegram, Reddit).
- **Image & Video Upload**: Upload and preview images and videos (Cloudinary integration).
- **Post Scheduling**: Schedule posts for future publishing (BullMQ + Redis).
- **Content Preview**: Preview adapted content before publishing.
- **Reach Analytics**:  Unified insights into likes, retweets, replies, Reddit karma, and Telegram member counts.
- **Comprehensive Error Handling**: Robust error and validation handling.
- **Responsive UI**: Built with React and Tailwind CSS.

---

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT, Passport.js
- **AI**: Open GPT-4 API
- **File Upload**: Multer, Cloudinary
- **Job Queue**: Redis, BullMQ
- **Social APIs**: Twitter API v2, Telegram Bot API, Reddit API

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/socialcross.git
cd socialcross
```

### 2. Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 3. Configure environment variables

- Copy `.env.example` to `.env` in both `backend/` and `frontend/`.
- Fill in all required values (see `.env.example` for details).

### 4. Start the development servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login

### Posts
- `POST /api/posts` — Create a post with adaptation
- `GET /api/posts` — Get user posts
- `PATCH /api/posts/:id/approve` — Approve adapted content
- `POST /api/posts/:id/publish` — Publish post

### Social Accounts
- `GET /api/social/accounts` — Get connected accounts
- `PATCH /api/social/accounts/:platform/toggle` — Toggle account status

### OAuth
- `GET /api/oauth/twitter` — Twitter OAuth
- `GET /api/oauth/telegram` — Telegram OAuth
- `GET /api/oauth/reddit` — Reddit OAuth
- `DELETE /api/auth/disconnect/:platform` — Disconnect account

### User
- `GET /api/user/profile` — Get user profile
- `PATCH /api/user/profile` — Update profile
- `GET /api/user/reach` — Get reach analytics

### AI
- `POST /api/ai/generate` — Generate content with AI (OpenAI)

---

## Social Media Setup

- **Twitter**: Register your app at [developer.twitter.com](https://developer.twitter.com/) and set up OAuth credentials.
- **Telegram**: Create a bot via [BotFather](https://core.telegram.org/bots#botfather) and get the bot token.
- **Reddit**: Register your app at [Reddit Apps](https://www.reddit.com/prefs/apps) and get client credentials.

---

## Content Adaptation

Content is adapted for each platform using custom logic:
- **Twitter**: Trims to 280 characters, adds hashtags, shortens links.
- **Telegram**: Adds emojis, supports images/videos, and hashtags.
- **Reddit**: Formats content in Markdown, includes links and images.

---

## Email Verification System

- When a user registers, a verification email is sent with a unique link.
- The user can log in for a limited grace period (e.g., 3 days) without verifying their email.
- After the grace period, login is blocked until the user verifies their email.
- Users can resend the verification email if needed.
- Once the user clicks the verification link in their email, their account is marked as verified and full access is granted.

---

## Scheduling

Posts can be scheduled using the BullMQ job queue and Redis.  
See `backend/src/jobs/postScheduler.ts` for implementation.

---

## Error Handling

- Validation errors
- Authentication errors
- Social media API errors
- File upload errors
- Database errors

---

## Security Features

- Helmet.js for security headers
- Rate limiting
- CORS configuration
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization

---

## Testing

Run backend tests with:
```bash
cd backend
npm test
```

---

## Production Deployment

1. Build the backend:
   ```bash
   cd backend
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```
3. Build and serve the frontend as needed.
4. Ensure all environment variables are set.
5. Set up SSL/TLS, reverse proxy, and monitoring as appropriate.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---
