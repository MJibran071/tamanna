import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', engine: 'kokoro', ttsReady: true },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰', engine: 'qwen_tts_0.6b', ttsReady: true },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', engine: 'qwen_tts_0.6b', ttsReady: true },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', engine: 'qwen_tts_0.6b', ttsReady: true },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳', engine: 'qwen_tts_0.6b', ttsReady: true },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', engine: 'qwen_tts_0.6b', ttsReady: true },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', engine: 'qwen_tts_0.6b', ttsReady: true },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', engine: 'qwen_tts_0.6b', ttsReady: true },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'sv', name: 'Swedish', native: 'Svenska', flag: '🇸🇪', engine: 'chatterbox_ml', ttsReady: true },
  { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', engine: 'chatterbox_ml', ttsReady: false },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳', engine: 'chatterbox_ml', ttsReady: false },
] as const;

// Popular language pairs for quick access
const POPULAR_PAIRS = [
  { from: 'en', to: 'ur', label: 'English → Urdu' },
  { from: 'en', to: 'hi', label: 'English → Hindi' },
  { from: 'en', to: 'ar', label: 'English → Arabic' },
  { from: 'en', to: 'zh', label: 'English → Chinese' },
  { from: 'en', to: 'es', label: 'English → Spanish' },
  { from: 'en', to: 'fr', label: 'English → French' },
  { from: 'ur', to: 'en', label: 'Urdu → English' },
  { from: 'hi', to: 'en', label: 'Hindi → English' },
  { from: 'ar', to: 'en', label: 'Arabic → English' },
  { from: 'zh', to: 'en', label: 'Chinese → English' },
  { from: 'es', to: 'en', label: 'Spanish → English' },
  { from: 'ja', to: 'en', label: 'Japanese → English' },
];

// Quick phrases for common travel/help scenarios
const QUICK_PHRASES = [
  { en: 'Hello, how are you?', context: 'greeting' },
  { en: 'Thank you very much', context: 'polite' },
  { en: 'Where is the nearest hospital?', context: 'emergency' },
  { en: 'How much does this cost?', context: 'shopping' },
  { en: 'Can you help me, please?', context: 'help' },
  { en: 'I need a taxi to the airport', context: 'travel' },
  { en: 'Where can I find a restaurant?', context: 'dining' },
  { en: 'I do not understand', context: 'communication' },
  { en: 'Please speak more slowly', context: 'communication' },
  { en: 'Goodbye and thank you', context: 'farewell' },
];

export async function GET() {
  return NextResponse.json({
    languages: LANGUAGES,
    popularPairs: POPULAR_PAIRS,
    quickPhrases: QUICK_PHRASES,
    totalLanguages: LANGUAGES.length,
    ttsReadyCount: LANGUAGES.filter((l) => l.ttsReady).length,
  });
}
