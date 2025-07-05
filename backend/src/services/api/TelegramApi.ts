import axios from 'axios';
import { ISocialMediaApi } from '../../types';

export class TelegramApi implements ISocialMediaApi {
  private botToken: string;
  private baseUrl = 'https://api.telegram.org';

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  async post(text: string, options: { chatId: string; media?: string[] }): Promise<any> {
    try {
      if (options?.media && options.media.length > 0) {
        const responses = [];
        for (let i = 0; i < options.media.length; i++) {
          const imageUrl = options.media[i];
          const caption = i === 0 ? text : '';

          const response = await axios.post(`${this.baseUrl}/bot${this.botToken}/sendPhoto`, {
            chat_id: options.chatId,
            photo: imageUrl,
            caption: caption,
            parse_mode: 'HTML'
          });

          responses.push(response.data);
        }
        return responses;
      } else {
        const response = await axios.post(`${this.baseUrl}/bot${this.botToken}/sendMessage`, {
          chat_id: options.chatId,
          text: text,
          parse_mode: 'HTML'
        });

        return response.data;
      }
    } catch (error: any) {
      console.error('Error sending Telegram message:', error.response?.data || error.message);
      throw new Error(`Failed to send Telegram message: ${error.response?.data?.description || error.message}`);
    }
  }

  async getPost(id: string): Promise<any> {
    throw new Error('getPost is not directly applicable for Telegram API in this context.');
  }

  async deletePost(id: string): Promise<void> {
    throw new Error('deletePost is not directly applicable for Telegram API in this context.');
  }

  async getUserProfile(identifier?: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/bot${this.botToken}/getMe`);
      return response.data.result;
    } catch (error: any) {
      console.error('Error fetching Telegram bot profile:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Telegram bot profile: ${error.message}`);
    }
  }

  async getChatMembersCount(chatId: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bot${this.botToken}/getChatMembersCount?chat_id=${chatId}`
      );
      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(response.data.description || 'Failed to get chat members count');
      }
    } catch (error: any) {
      console.error('Error fetching Telegram chat members count:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Telegram chat members count: ${error.message}`);
    }
  }
}