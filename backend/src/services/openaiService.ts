import OpenAI from 'openai';
import { config } from '../config/config';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY, // Make sure this env variable is set
});

export class OpenAIService {
  static async generateContent(prompt: string): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4' if you have access
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });
    const content = completion.choices[0].message.content;
    return content ? content.trim() : '';
  }
}
