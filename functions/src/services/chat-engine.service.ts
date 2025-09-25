import { OpenAIService2 } from './openai-service2';
import { welcomeMessagePrompt } from '../constants/welcome-message-prompt';
import { userQueryPrompt } from '../constants/user-query-prompt';
import { UserQuery } from '../interfaces/user-query.interface';
import { EasyInputMessage } from 'openai/resources/responses/responses';
import { SettingsService } from './settings.service';

export class ChatEngineService {
  openaiService = new OpenAIService2();
  settingsService = new SettingsService();

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

    //<----------------------------- Case A first turn ----------------------------------->

    if (isFirstTurn) {
      const conversation = await this.openaiService.createConversation();
      this.conversationId = conversation.id;

      const firstRunResponse = await this.handleFirstTurn();
      return {
        reply: firstRunResponse,
        conversationId: this.conversationId!,
      };
    }

    // <-------777-----------------------------Handle Existing conversation--------------------------------------------------->

    const lastMessages = await this.openaiService.getLastMessages(
     this.conversationId!
    );

    const userQuery = await this.handleUserQuery(message, lastMessages);

    if (userQuery?.query) {
      return {
        reply: 'query',
        conversationId: this.conversationId!,
      };
    }

    // <-------777-------------------------------------------------------------------------------->
    // <-------777--------------------------------Strategies------------------------------------------------>

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
      console.error('Error generating welcome message:', error);

      // Fallback static message
      return null;
    }
  }



  /**
   * Handles the first turn welcome message with optimized locale and channel validation
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

  // private async handleFollowUpQuestion(): Promise<string> {
  //   // Generate follow-up question using AI (reusing lastMsgsStr from earlier)
  //   const response =
  //     await this.followupQuestionService.generateFollowUpQuestion(
  //       {
  //         company: this.company,
  //         currentIntent: this.userIntent!.parsedIntent,
  //         missingInformation: this.userIntent!.missingInformation,
  //         userLanguage: this.detectedUserLanguage || '',
  //       },
  //       this.openiaId!
  //     );
  //
  //   // Update conversation state with new values from classified message BEFORE returning response
  //   await this.updateConversationStateIfNeeded(
  //     this.conversationId,
  //     this.conversationRef,
  //     this.userIntent!,
  //     this.conversationState
  //   );
  //
  //   // Update summary in background without blocking the return
  //   if (this.conversationId && this.conversationRef) {
  //     this.backgroundTaskService.updateSummary(
  //       this.conversationId,
  //       this.conversationRef,
  //       this.userMessage!,
  //       this.openiaId!
  //     );
  //   }
  //
  //   if (response.transactions?.length) {
  //     this.transactions.push(...response.transactions);
  //   }
  //
  //   this.registerTransactions();
  //
  //   return response.reply;
  // }



}
