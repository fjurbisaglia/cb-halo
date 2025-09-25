import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ChatbotAiService } from '../../services/chatbot-ai.service';
import { INITIAL_TRIGGER } from '../../constants/initial-trigger.constants';


interface Message {
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Component({
  selector: 'app-chat-bot',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  providers: [ChatbotAiService],
  templateUrl: './chat-bot.component.html',
  styleUrl: './chat-bot.component.scss',
})
export class ChatBotComponent implements OnInit {
  messages: Message[] = [];
  isTyping = signal(false);

  private aiService = inject(ChatbotAiService);

  formControl = new FormControl('');

  constructor() {
    effect(() => {
      const conversationId = this.aiService.conversationId();

      if (
        conversationId
      ) {
        this.loadMessagesFromStorage();
      }
    });
  }

  ngOnInit(): void {
    if (
      !this.aiService.conversationId()
    ) {
      this.getReply(INITIAL_TRIGGER);
    }
  }

  private loadMessagesFromStorage(): void {
    const conversationId = this.aiService.conversationId();
    if (conversationId) {
      const savedMessages = localStorage.getItem(`messages_${conversationId}`);

      if (savedMessages) {
        try {
          this.messages = JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        } catch (error) {
          console.error('Error loading messages from storage:', error);
        }
      }
    }
  }

  private saveMessagesToStorage(): void {
    const conversationId = this.aiService.conversationId();
    if (conversationId && conversationId !== 'auto') {
      localStorage.setItem(
        `messages_${conversationId}`,
        JSON.stringify(this.messages)
      );
    }
  }

  getReply(message: string): void {
    this.isTyping.set(true);
    this.aiService
      .getReply$(message)
      .pipe(finalize(() => this.isTyping.set(false)))
      .subscribe((res) => {
        this.addMessage(res, 'ai');
      });
  }

  sendMessage(): void {
    const message = this.formControl.value;
    if (message?.trim() === '') return;

    this.addMessage(message ?? '', 'user');
    this.getReply(message ?? '');
    this.formControl.setValue('');
  }

  addMessage(content: string, sender: 'user' | 'ai'): void {
    this.messages.push({
      content,
      sender,
      timestamp: new Date(),
    });

    this.saveMessagesToStorage();

    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  resetConversation(): void {
    this.messages = [];

    this.aiService.resetConversation();

    this.getReply(INITIAL_TRIGGER);
  }
}
