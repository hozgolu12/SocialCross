import express from 'express';
import { OpenAIService } from '../services/openaiService';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    const content = await OpenAIService.generateContent(prompt);
    console.log('Generated content:', content);
    res.json({ content });
  } catch (error: any) {
    console.log('AI generation error:', error);
    res.status(500).json({ message: 'AI generation failed', error: error.message });
  }
});

export default router;