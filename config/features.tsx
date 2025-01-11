import { Icon } from '@chakra-ui/react';
import { BsMusicNoteBeamed } from 'react-icons/bs';
import { FaGamepad } from 'react-icons/fa';
import { IoHappy } from 'react-icons/io5';
import { MdAddReaction, MdMessage } from 'react-icons/md';
import { FeaturesConfig } from './types';
import { provider, TranslationKeys } from './translations/provider';
import { useWelcomeMessageFeature } from './example/WelcomeMessageFeature';
import { useMemeFeature } from './example/MemeFeature';
import { useTriggerWordsFeature } from './example/TriggerWordsFeature';

type Translation = {
  [key in TranslationKeys]: string;
};

export interface Feature {
  name: TranslationKeys;
  description: TranslationKeys;
  icon: React.FC;
  useRender: () => {
    component: React.ReactNode;
    onSubmit: () => void;
  };
}

export const features: FeaturesConfig = {
  music: {
    name: 'music',
    description: 'music description',
    icon: <Icon as={BsMusicNoteBeamed} />,
    useRender() {
      return {
        component: <></>,
        onSubmit: () => {},
      };
    },
  },
  'welcome-message': {
    name: 'Welcome Message',
    description: 'Send message when user joined the server',
    icon: <Icon as={MdMessage} />,
    useRender: useWelcomeMessageFeature,
  },
  gaming: {
    name: 'gaming',
    description: 'gaming description',
    icon: <Icon as={FaGamepad} />,
    useRender() {
      return {
        component: <></>,
        onSubmit: () => {},
      };
    },
  },
  'reaction-role': {
    name: 'reaction role',
    description: 'reaction role description',
    icon: <Icon as={MdAddReaction} />,
    useRender() {
      return {
        component: <></>,
        onSubmit: () => {},
      };
    },
  },
  meme: {
    name: 'memes',
    description: 'memes description',
    icon: <Icon as={IoHappy} />,
    useRender: useMemeFeature,
  },
  'trigger-words': {
    name: 'trigger words',
    description: 'trigger words description',
    icon: <Icon as={MdMessage} />,
    useRender: useTriggerWordsFeature,
  },
};
