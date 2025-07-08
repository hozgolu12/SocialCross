import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { OpenAIService } from '../services/openaiService';
import { auth } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload and analyze logo
router.post('/upload', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file provided' });
    }

    // Send image to Python microservice
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
    
    try {
      const response = await axios.post(`${pythonServiceUrl}/analyze-logo`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000 // 30 second timeout
      });

      res.json({
        success: true,
        data: response.data
      });
    } catch (pythonError: any) {
      console.error('Python service error:', pythonError.message);
      
      // Fallback response if Python service is unavailable
      res.json({
        success: true,
        data: {
          brand_name: "Your Brand",
          colors: ["#3B82F6", "#10B981", "#F59E0B"],
          dominant_color: "#3B82F6"
        },
        fallback: true
      });
    }

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to process logo',
      error: error.message 
    });
  }
});

// Generate AI content
router.post('/generate-post', auth, async (req, res) => {
  try {
    const { 
      brandName, 
      purpose, 
      targetAudience, 
      tone, 
      platform, 
      colors 
    } = req.body;

    // Validate required fields
    if (!purpose || !targetAudience || !tone || !platform) {
      return res.status(400).json({ 
        message: 'Missing required fields: purpose, targetAudience, tone, platform' 
      });
    }

    // Create platform-specific prompt
    const platformText = Array.isArray(platform) ? platform.join(', ') : platform;
    const colorsText = Array.isArray(colors) ? colors.join(', ') : colors;

    const prompt = `Generate a short and engaging social media post for ${platformText} for a brand called '${brandName || 'this brand'}' with theme colors ${colorsText}. 
The post purpose is: '${purpose}'. Use a ${tone} tone aimed at ${targetAudience}.
Make the post catchy and aligned with modern brand marketing language.

Requirements:
- Keep it concise and platform-appropriate
- Include relevant hashtags
- Make it engaging and actionable
- Reflect the ${tone} tone throughout
- Target the ${targetAudience} audience specifically

Return only the post content without any additional formatting or explanations.`;

    const generatedContent = await OpenAIService.generateContent(prompt);

    res.json({
      success: true,
      content: generatedContent,
      metadata: {
        brandName,
        purpose,
        targetAudience,
        tone,
        platform: platformText,
        colors
      }
    });

  } catch (error: any) {
    console.error('AI generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate content',
      error: error.message 
    });
  }
});

// Regenerate content with same parameters
router.post('/regenerate-post', auth, async (req, res) => {
  try {
    const { metadata } = req.body;

    if (!metadata) {
      return res.status(400).json({ message: 'Metadata required for regeneration' });
    }

    const { brandName, purpose, targetAudience, tone, platform, colors } = metadata;

    const prompt = `Generate a different short and engaging social media post for ${platform} for a brand called '${brandName || 'this brand'}' with theme colors ${colors}. 
The post purpose is: '${purpose}'. Use a ${tone} tone aimed at ${targetAudience}.
Make this version unique and fresh while maintaining the same brand voice.

Requirements:
- Keep it concise and platform-appropriate
- Include relevant hashtags
- Make it engaging and actionable
- Reflect the ${tone} tone throughout
- Target the ${targetAudience} audience specifically
- Make it different from previous versions

Return only the post content without any additional formatting or explanations.`;

    const generatedContent = await OpenAIService.generateContent(prompt);

    res.json({
      success: true,
      content: generatedContent,
      metadata
    });

  } catch (error: any) {
    console.error('AI regeneration error:', error);
    res.status(500).json({ 
      message: 'Failed to regenerate content',
      error: error.message 
    });
  }
});

export default router;