import type { CSSProperties } from 'react';

export type WelcomeTextConfig = {
  mode: string;
  text: string;
  translations: Record<string, string>;
  messages: string[];
  messagesTranslations: Record<string, string[]>;
  selectedMessage: string;
  language: string;
  displayName: string;
  mainPrompt: string;
};

const GRADIENT_PRESETS: Record<string, string> = {
  sunset: 'linear-gradient(to right, #FF6B6B, #FFE66D)',
  ocean: 'linear-gradient(to right, #4A90E2, #9B59B6)',
  aurora: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
  neon: 'linear-gradient(to right, #00FFF0, #FF00FF)',
  solar: 'linear-gradient(to right, #FDB813, #FF6B6B)',
  chatbuttons: 'linear-gradient(to right, #3B82F6, #EAB308, #EA580C, #EF4444, #A855F7)',
};

export function getWelcomeTextGradientStyle(gradient: string): CSSProperties {
  const gradientCSS = GRADIENT_PRESETS[gradient];
  if (!gradientCSS) return {};
  return {
    background: gradientCSS,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
  };
}

export function resolveWelcomeText(config: WelcomeTextConfig): string {
  const lang = config.language || 'en';

  if (config.mode === 'default') return config.mainPrompt;

  if (config.mode === 'dynamic' && config.selectedMessage) {
    let message = config.selectedMessage;
    const translated = config.messagesTranslations[lang];
    if (translated) {
      const index = config.messages.indexOf(config.selectedMessage);
      if (index !== -1 && translated[index]) message = translated[index];
    }
    return message.replace(/{Username}/g, config.displayName);
  }

  if (config.text === 'What can I help with?') return config.mainPrompt;
  if (config.translations[lang]) return config.translations[lang];
  return config.translations['en'] || config.text;
}
