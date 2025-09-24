export interface ChatRequestBody {
  companyId?: string;
  message?: string;
  channel?: 'web' | 'whatsapp' | 'telegram';
  conversationId?: string;
  locale?: string;
  openiaId?: string;
}
