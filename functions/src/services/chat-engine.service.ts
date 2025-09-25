import { OpenAIService2 } from './openai-service2';
import { welcomeMessagePrompt } from '../constants/welcome-message-prompt';
import { userQueryPrompt } from '../constants/user-query-prompt';
import { UserQuery } from '../interfaces/user-query.interface';
import { EasyInputMessage } from 'openai/resources/responses/responses';
import { SettingsService } from './settings.service';
import { VectorSearchService } from './vector-search.service';


export class ChatEngineService {
  openaiService = new OpenAIService2();
  settingsService = new SettingsService();
  vectorSearchService = new VectorSearchService();
  conversationId: string | undefined;
  summary: string | undefined;
  browserLocale: string | undefined;
  userMessage: string | undefined;

  async handleUserMessage(params: {
    message: string;
    locale?: string;
    conversationId?: string;
  }): Promise<{
    reply: string;
    conversationId: string;
  }> {
    // Extract parameters
    const {
      message,
      conversationId,
      locale = 'en',
    } = params;

    this.conversationId = conversationId;
    // Company, isFirstTurn, and conversation data are already validated and loaded by the decorators
    this.browserLocale = locale;
    this.userMessage = message;
    const isFirstTurn = !conversationId;

    // Handle first turn conversation
    if (isFirstTurn) {
      const conversation = await this.openaiService.createConversation();
      this.conversationId = conversation.id;

      const firstRunResponse = await this.handleFirstTurn();

      await this.openaiService.addItems(this.conversationId!, [
        { role: 'assistant', content: firstRunResponse} ,
      ]);

      return {
        reply: firstRunResponse,
        conversationId: this.conversationId!,
      };
    }

    // Handle existing conversation
    const lastMessages = await this.openaiService.getLastMessages(
     this.conversationId!
    );

    const userQuery = await this.handleUserQuery(message, lastMessages);

    if (userQuery?.query) {
      // 1) Generate query embedding
      const embedding = await this.openaiService.embed(userQuery.query);

      // 2) Find similar vectors and context (with local fallback if Vertex fails)
      const { context } = await this.vectorSearchService.findWithContext(
        embedding,
        5,
      );

      // 3) Generate final response with context
      const system = `You are a concise travel-insurance assistant.
       Use ONLY the provided context to recommend the filtered travel insurance plans.`;

      const userInput = `User message: ${message}\n\nParsed query: ${userQuery.query}\n\nContext:\n${context || '(no context found)'}`;
      const final = await this.openaiService.gpt5NanoText(system, userInput, lastMessages);

      await this.openaiService.addItems(this.conversationId!, [
        {role: 'user', content: message},
        { role: 'assistant', content: final.response} ,
      ]);

      return {
        reply: final.response || 'Let me know your destination region and coverage needed to recommend a plan.',
        conversationId: this.conversationId!,
      };
    }

    // Handle alternative when more information is needed
    const messages: EasyInputMessage[] = [
      {role: 'user', content: message},
      {role: 'assistant', content: userQuery?.reply || 'reply'},
    ]
    await this.openaiService.addItems(this.conversationId!, messages);

    return {
      reply: userQuery?.reply || 'reply',
      conversationId: this.conversationId!,
    };
  }

  private async handleUserQuery(userMessage: string, history: any[]): Promise<UserQuery | null> {
    try {
      // Get settings from database with fallback values
      const settings = await this.settingsService.getSettingsWithDefaults();

      const {botName, tone, companyName, companySlogan, companyIndustry, temperature} = settings;

      const system = userQueryPrompt(botName!, tone ||
        [], companySlogan!, companyIndustry!, companyName!);
      const response = await this.openaiService.gpt4Json<UserQuery>(system, temperature, 200, userMessage, history);

      return response.response;
    } catch (error) {
      console.error('Error processing user query:', error);

      // Return null to indicate query processing failed
      return null;
    }
  }

  /**
   * Handles the first turn of a conversation by generating a personalized welcome message
   * based on company settings and user locale
   */
  private async handleFirstTurn(): Promise<string> {
    try {
      // Get settings from database with fallback values
      const settings = await this.settingsService.getSettingsWithDefaults();

      const {botName, tone, companyName, companySlogan, companyIndustry} = settings;


      const system = welcomeMessagePrompt(companyName || '', companyIndustry || '', botName || '',
        tone || [], companySlogan || '', this.browserLocale!);
      const response = await this.openaiService.gpt5NanoText(system);

      return response.response;
    } catch (error) {
      console.error('Error generating welcome message:', error);

      // Fallback static message
      return (
        `Hi, I'm the assistant of TravelAssistance. How can I help you today?`
      );
    }
  }
}
