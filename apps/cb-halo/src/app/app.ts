import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcome } from './nx-welcome';
import { ChatBotComponent } from './components/chat-bot/chat-bot.component';

@Component({
  imports: [RouterModule, ChatBotComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'cb-halo';
  isChatbotOpen = signal(false);

  toggleChatbot() {
    this.isChatbotOpen.set(!this.isChatbotOpen());
  }

  closeChatbot() {
    this.isChatbotOpen.set(false);
  }
}
