import { createI18n } from '../../utils/i18n';

const translations = {
  en: {
    music: 'Music Player',
    'music description': 'Play music in Your Discord Server',
    gaming: 'Gaming',
    'gaming description': 'Enjoy playing games with your friends',
    'reaction role': 'Reaction Role',
    'reaction role description': 'Give user a role when clicking on a button',
    memes: 'Memes Time',
    'memes description': 'Send memes everyday',
    'trigger words': 'Trigger Words',
    'trigger words description': 'Automatically respond when specific words are detected',
  },
  cn: {
    music: '音樂播放器',
    'music description': '在您的 Discord 服務器中播放音樂',
    gaming: '遊戲',
    'gaming description': 'Enjoy playing games with your friends',
    'reaction role': '反應角色',
    'reaction role description': '單擊按鈕時為用戶賦予角色',
    memes: '模因時間',
    'memes description': '每天發送模因',
    'trigger words': '觸發詞',
    'trigger words description': '檢測到特定詞語時自動回應',
  },
};

export const provider = createI18n(translations, 'en');

export type TranslationKeys = keyof typeof translations.en;
