import { botSetting } from './bot-settings';

export const welcomeMessagePrompt = (
  botName: string,
  tone: string[],
  companySlogan: string,
  locale: string,
  maxChars = 170
) => `
${botSetting(botName, tone, companySlogan)}

Task: Write a short chatbot welcome message in **${locale}**, max ${maxChars} characters.
Base it on the company info above.

Rules:
- Introduce yourself with your name.
- Be concise, natural, and aligned with the defined tone.
- Respond only in ${locale}.
- Output **only** the final greeting (no explanations, no meta text).
`;
