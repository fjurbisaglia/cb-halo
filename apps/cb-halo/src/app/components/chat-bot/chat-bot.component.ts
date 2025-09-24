import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
// import { Company, CompanyService } from '@chatbot/company';
import { finalize } from 'rxjs';

import { ChatbotAiService } from '../services/chatbot-ai.service';
import { INITIAL_TRIGGER } from '../constants/initial-trigger.constants';

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
  // company = signal<Company | null>(null);
  chatbotImageUrl = signal<string | null>(null);

  private route = inject(ActivatedRoute);
  private aiService = inject(ChatbotAiService);
  // private companyService = inject(CompanyService);

  companyId = signal<string>('');

  formControl = new FormControl('');

  constructor() {
    // Effect to watch for conversationId changes and load messages when available
    effect(() => {
      const conversationId = this.aiService.conversationId();

      // Only load messages if we have a valid conversationId and it's not the initial 'auto'
      if (
        conversationId &&
        conversationId !== 'auto' &&
        this.messages.length === 0
      ) {
        this.loadMessagesFromStorage();
      }
    });
  }

  ngOnInit(): void {
    this.companyId.set(this.getCompanyIdFromScript() || '');

    // Load messages from storage first if there's an existing conversation
    this.loadMessagesFromStorage();

    // if (this.companyId()) {
    //   this.loadCompanyData(this.companyId());
    // }

    // Only start a new conversation if there's no existing conversationId or it's 'auto'
    if (
      !this.aiService.conversationId() ||
      this.aiService.conversationId() === 'auto'
    ) {
      this.getReply(INITIAL_TRIGGER);
    }
  }

  private loadMessagesFromStorage(): void {
    const conversationId = this.aiService.conversationId();
    if (conversationId && conversationId !== 'auto') {
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

  private getCompanyIdFromScript(): string | null {
    try {
      // Get company ID from URL parameters (passed by chatbot.js)
      const urlParams = new URLSearchParams(window.location.search);
      const companyId = urlParams.get('companyId');
      console.log('Company ID from script:', companyId);
      return companyId || null;
    } catch (error) {
      console.error('Error getting company ID from script:', error);
      return null;
    }
  }

  // loadCompanyData(companyId: string): void {
  //   this.companyService.getCompanyById(companyId).subscribe({
  //     next: (company) => {
  //       this.company.set(company);
  //       // Extract chatbot image URL from settings
  //       const imageUrl = company?.settings?.chatbotImageUrl;
  //       this.chatbotImageUrl.set(imageUrl || null);
  //     },
  //     error: (error) => {
  //       console.error('Error loading company data:', error);
  //       this.company.set(null);
  //       this.chatbotImageUrl.set(null);
  //     },
  //   });
  // }

  getReply(message: string): void {
    this.isTyping.set(true);
    this.aiService
      .getReply$(message, this.companyId())
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

    // Guardar mensajes en localStorage
    this.saveMessagesToStorage();

    // Scroll to bottom after message is added
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  resetConversation(): void {
    // Limpiar mensajes de la pantalla
    this.messages = [];

    // Resetear conversación en el servicio (limpia localStorage)
    this.aiService.resetConversation();

    // Iniciar nueva conversación
    this.getReply(INITIAL_TRIGGER);
  }
}
