export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface Segment {
  thai: string;
  transliteration: string;
  english: string;
  partOfSpeech: string;
  synonyms?: string[];
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  transliteration: string; // Romanization
  segments: Segment[];
  exampleSentenceThai: string;
  exampleSentenceEnglish: string;
  audioBase64?: string; // Optional, might be fetched separately
}

export interface VocabFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface VocabCard {
  id: string;
  folderId?: string; // ID of the folder it belongs to. Undefined means 'General'/'Uncategorized'
  thai: string;
  transliteration: string;
  english: string;
  partOfSpeech?: string;
  exampleThai?: string;
  exampleEnglish?: string;
  dateAdded: number;
}

export enum AppTab {
  TRANSLATE = 'TRANSLATE',
  VOCABULARY = 'VOCABULARY',
  QUIZ = 'QUIZ'
}

export interface QuizQuestion {
  question: string;
  correctAnswer: string;
  options: string[];
  type: 'THAI_TO_ENG' | 'ENG_TO_THAI';
  card?: VocabCard;
}