import { signal } from '@angular/core';
import { from, Observable } from 'rxjs';

type ChatRunResponse = {
  conversationId: string;
  reply: string;
};

export class ChatbotAiService {
  private endpoint = 'https://us-central1-cb-halo.cloudfunctions.net/chatRun';

  conversationId = signal<string | null>(null);

  constructor() {
    // Retrieve from localStorage or initialize as null
    this.conversationId.set(localStorage.getItem('conversationId') || null);
  }

  private getBrowserLocale(): string {
    // "es-AR" -> "es"
    return (navigator.language || 'es').split('-')[0].toLowerCase();
  }

  getReply$(message: string): Observable<string> {
    const body = {
      message,
      conversationId: this.conversationId() || undefined,
      locale: this.getBrowserLocale(),
    };

    return from(
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err?.error || `HTTP ${r.status}`);
          }
          return r.json() as Promise<ChatRunResponse>;
        })
        .then((data) => {
          // Save conversationId for subsequent turns
          if (data.conversationId) {
            this.conversationId.set(data.conversationId);
            localStorage.setItem('conversationId', this.conversationId()!);
          }
          return data.reply ?? '[No response]';
        })
        .catch((e) => {
          console.error('chatRun error', e);
          return '[Error] Could not process your message.';
        })
    );
  }

  resetConversation() {
    const currentConversationId = this.conversationId();

    // Clear messages from current conversation
    if (currentConversationId) {
      localStorage.removeItem(`messages_${currentConversationId}`);
    }

    this.conversationId.set(null);
    localStorage.removeItem('conversationId');
  }
}
