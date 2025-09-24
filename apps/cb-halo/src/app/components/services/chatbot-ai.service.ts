import { signal } from '@angular/core';
import { from, Observable } from 'rxjs';

type ChatRunResponse = {
  conversationId: string;
  reply: string;
  usedItemIds?: string[];
};

export class ChatbotAiService {
  private endpoint = 'https://chatrun-drhgcr6qya-uc.a.run.app';
  private channel: 'web' | 'whatsapp' = 'web';

  conversationId = signal<string | 'auto' | null>(null);

  constructor() {
    // Recuperar de localStorage o iniciar en 'auto'
    this.conversationId.set(localStorage.getItem('conversationId') || 'auto');
  }

  private getBrowserLocale(): string {
    // "es-AR" -> "es"
    return (navigator.language || 'es').split('-')[0].toLowerCase();
  }

  getReply$(message: string, companyId: string): Observable<string> {
    const body = {
      companyId,
      message,
      channel: this.channel,
      conversationId: this.conversationId() || 'auto',
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
          // Guardar conversationId para siguientes turnos
          if (data.conversationId) {
            this.conversationId.set(data.conversationId);
            localStorage.setItem('conversationId', this.conversationId()!);
          }
          return data.reply ?? '[Sin respuesta]';
        })
        .catch((e) => {
          console.error('chatRun error', e);
          return '[Error] No pude procesar tu mensaje.';
        })
    );
  }

  resetConversation() {
    const currentConversationId = this.conversationId();

    // Limpiar mensajes de la conversación actual
    if (currentConversationId && currentConversationId !== 'auto') {
      localStorage.removeItem(`messages_${currentConversationId}`);
    }

    this.conversationId.set('auto');
    localStorage.removeItem('conversationId');
  }
}
