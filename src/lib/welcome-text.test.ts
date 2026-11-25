import { describe, it, expect } from 'vitest';
import { resolveWelcomeText, getWelcomeTextGradientStyle, type WelcomeTextConfig } from './welcome-text';

const base: WelcomeTextConfig = {
  mode: 'default',
  text: 'What can I help with?',
  translations: {},
  messages: [],
  messagesTranslations: {},
  selectedMessage: '',
  language: 'en',
  displayName: 'Sam',
  mainPrompt: 'Translated main prompt',
};

describe('resolveWelcomeText', () => {
  it('uses the translated main prompt in default mode', () => {
    expect(resolveWelcomeText(base)).toBe('Translated main prompt');
  });

  it('uses the selected dynamic message with the {Username} placeholder filled in', () => {
    const config = { ...base, mode: 'dynamic', messages: ['Hi {Username}!'], selectedMessage: 'Hi {Username}!' };
    expect(resolveWelcomeText(config)).toBe('Hi Sam!');
  });

  it('uses the translated dynamic message for the current language', () => {
    const config = {
      ...base,
      mode: 'dynamic',
      language: 'es',
      messages: ['Hello', 'Hi {Username}'],
      messagesTranslations: { es: ['Hola', 'Qué tal {Username}'] },
      selectedMessage: 'Hi {Username}',
    };
    expect(resolveWelcomeText(config)).toBe('Qué tal Sam');
  });

  it('uses the custom text translation for the current language', () => {
    const config = { ...base, mode: 'custom', text: 'Ask the archive', language: 'fr', translations: { fr: 'Interrogez les archives' } };
    expect(resolveWelcomeText(config)).toBe('Interrogez les archives');
  });

  it('falls back to the custom text when no translation exists', () => {
    const config = { ...base, mode: 'custom', text: 'Ask the archive', language: 'fr' };
    expect(resolveWelcomeText(config)).toBe('Ask the archive');
  });

  it('uses the translated main prompt when the custom text is the stock default', () => {
    const config = { ...base, mode: 'custom', text: 'What can I help with?' };
    expect(resolveWelcomeText(config)).toBe('Translated main prompt');
  });
});

describe('getWelcomeTextGradientStyle', () => {
  it('returns no style when the gradient is none', () => {
    expect(getWelcomeTextGradientStyle('none')).toEqual({});
  });

  it('returns a clipped text gradient for a known preset', () => {
    const style = getWelcomeTextGradientStyle('ocean');
    expect(style.background).toBe('linear-gradient(to right, #4A90E2, #9B59B6)');
    expect(style.WebkitTextFillColor).toBe('transparent');
  });

  it('returns no style for an unknown preset', () => {
    expect(getWelcomeTextGradientStyle('plaid')).toEqual({});
  });
});
