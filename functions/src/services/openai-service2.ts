import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';
import { EasyInputMessage } from 'openai/resources/responses/responses';

import { OpeniaModels } from '../enums/openia-models.enum';
import { OpenAIResponse } from '../interfaces/openia-response.interface';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * Service for handling OpenAI API calls
 */
export class OpenAIService2 {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY.value(),
    });
  }

  async createConversation() {
    return this.openai.conversations.create({});
  }

  async getLastMessages(openiaId: string) {
    const response = await this.openai.conversations.items.list(openiaId, {
      limit: 10,
    });

    const previousMessages = response.data as any[];

    return previousMessages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        role: msg.role,
        content: msg.content[0]?.text || '',
      }));
  }

  async addItems(openiaId: string, items: EasyInputMessage[]) {
    return this.openai.conversations.items.create(openiaId, { items });
  }

  async gpt5NanoText(
    system: string,
    userInput?: string,
    history?: EasyInputMessage[]
  ): Promise<OpenAIResponse> {
    const input: any[] = [
      { role: 'system', content: system },
      ...(history || []),
      ...(userInput ? [{ role: 'user', content: userInput }] : []),
    ];

    const response = await this.openai.responses.create({
      model: OpeniaModels.gpt5Nano,
      input,
    });

    return {
      response: response.output_text,
    };
  }

  async gpt4Json<T = any>(
    system: string,
    temperature?: number,
    max_output_tokens?: number,
    userInput?: string,
    history?: EasyInputMessage[]
  ): Promise<OpenAIResponse<T>> {
    const input: any[] = [
      { role: 'system', content: system },
      ...(history || []),
      ...(userInput ? [{ role: 'user', content: userInput }] : []),
    ];

    const response = await this.openai.responses.create({
      model: OpeniaModels.gpt4oMini,
      input,
      max_output_tokens: max_output_tokens || 256,
      temperature: temperature || 0.1,
      text: { format: { type: 'json_object' } },
    });

    const jsonText = (response as any).output_text || '';

    let parsedResponse: T;
    try {
      parsedResponse = JSON.parse(jsonText || '{}') as T;
    } catch (err) {
      console.error('Error parsing JSON from OpenAI:', err, jsonText);
      parsedResponse = {} as T;
    }

    return {
      response: parsedResponse,
    };
  }
}
