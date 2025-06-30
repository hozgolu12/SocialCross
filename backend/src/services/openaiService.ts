
import OpenAI from 'openai';
import { config } from '../config/config';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export interface ContentAdaptationRequest {
  originalContent: string;
  platform: 'twitter' | 'telegram' | 'reddit';
  hasImages: boolean;
}

export interface AdaptedContent {
  content: string;
  hashtags: string[];
  explanation: string;
}

export class OpenAIService {
  static async adaptContent(request: ContentAdaptationRequest): Promise<AdaptedContent> {
    const prompts = {
      twitter: `Adapt this content for Twitter (X):
- Keep within 280 characters
- Make it engaging and conversational
- Add relevant hashtags (max 3)
- Maintain the core message
${request.hasImages ? '- Account for image attachment' : ''}

Original content: "${request.originalContent}"

Return JSON with: content, hashtags (array), explanation`,

      telegram: `Adapt this content for Telegram:
- Can be longer and more detailed
- Use emojis to make it engaging
- Add relevant hashtags (max 5)
- Format for easy reading
${request.hasImages ? '- Account for image/video attachment' : ''}

Original content: "${request.originalContent}"

Return JSON with: content, hashtags (array), explanation`,

      reddit: `Adapt this content for Reddit:
- Create an engaging title and detailed post
- Follow Reddit etiquette and formatting
- Add relevant hashtags/keywords (max 7)
- Encourage discussion and engagement
${request.hasImages ? '- Account for image attachment' : ''}

Original content: "${request.originalContent}"

Return JSON with: content, hashtags (array), explanation`
    };

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a social media expert. Always return valid JSON with the exact structure requested.'
          },
          {
            role: 'user',
            content: prompts[request.platform]
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const adaptedContent = JSON.parse(result);
      
      if (!adaptedContent.content || !Array.isArray(adaptedContent.hashtags)) {
        throw new Error('Invalid response structure from OpenAI');
      }

      return adaptedContent;
    } catch (error) {
      console.error('OpenAI adaptation error:', error);
      return this.fallbackAdaptation(request);
    }
  }

  private static fallbackAdaptation(request: ContentAdaptationRequest): AdaptedContent {
    let content = request.originalContent;
    let hashtags: string[] = [];

    switch (request.platform) {
      case 'twitter':
        content = content.length > 250 ? content.substring(0, 247) + '...' : content;
        hashtags = ['#social', '#content'];
        break;
      case 'telegram':
        content = content + ' 📱';
        hashtags = ['#telegram', '#content', '#social'];
        break;
      case 'reddit':
        content = `**${content.substring(0, 50)}...**\n\n${content}`;
        hashtags = ['#reddit', '#discussion', '#community'];
        break;
    }

    return {
      content,
      hashtags,
      explanation: 'Fallback adaptation due to AI service unavailability'
    };
  }
}
