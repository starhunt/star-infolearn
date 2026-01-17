/**
 * Global App State Management using Zustand
 */

import create from 'zustand';
import { AIProvider, AIProviderConfig, BlankingData, AssociationLink, KeywordIdentificationResult } from '../types/ai';

export interface AppStateData {
  // UI State
  currentMode: 'blanking' | 'rewriting' | 'association' | 'settings' | null;
  currentFile: File | null;
  currentFileName: string;
  isLoading: boolean;
  error: string | null;

  // AI State
  currentAIProvider: AIProvider;
  aiProviders: Record<AIProvider, AIProviderConfig>;

  // Feature Data
  blankingData: BlankingData | null;
  associationLinks: AssociationLink[];
  selectedBlanks: string[]; // IDs of selected blanks
  rewriteResult: string | null;

  // UI Interactions
  showSettings: boolean;
  showResults: boolean;
}

export interface AppState extends AppStateData {
  // Actions
  setCurrentMode: (mode: 'blanking' | 'rewriting' | 'association' | 'settings' | null) => void;
  setCurrentFile: (file: File | null, fileName: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAIProvider: (provider: AIProvider) => void;
  updateAIProviderConfig: (provider: AIProvider, config: Partial<AIProviderConfig>) => void;
  setBlankingData: (data: BlankingData | null) => void;
  setAssociationLinks: (links: AssociationLink[]) => void;
  addAssociationLink: (link: AssociationLink) => void;
  removeAssociationLink: (linkId: string) => void;
  setSelectedBlanks: (blankIds: string[]) => void;
  toggleSelectedBlank: (blankId: string) => void;
  setRewriteResult: (result: string | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowResults: (show: boolean) => void;
  reset: () => void;
}

const initialState: AppStateData = {
  currentMode: null,
  currentFile: null,
  currentFileName: '',
  isLoading: false,
  error: null,
  currentAIProvider: 'gemini' as AIProvider,
  aiProviders: {
    openai: { provider: 'openai' as AIProvider, apiKey: '', model: 'gpt-4-turbo' },
    anthropic: { provider: 'anthropic' as AIProvider, apiKey: '', model: 'claude-3-opus' },
    gemini: { provider: 'gemini' as AIProvider, apiKey: '', model: 'gemini-2.0-flash' },
    grok: { provider: 'grok' as AIProvider, apiKey: '', model: 'grok-3' },
    zhipu: { provider: 'zhipu' as AIProvider, apiKey: '', model: 'glm-4.7', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  },
  blankingData: null,
  associationLinks: [],
  selectedBlanks: [],
  rewriteResult: null,
  showSettings: false,
  showResults: false,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState as AppState,

  setCurrentMode: (mode) => set({ currentMode: mode }),

  setCurrentFile: (file, fileName) => set({ currentFile: file, currentFileName: fileName }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setAIProvider: (provider) => set({ currentAIProvider: provider }),

  updateAIProviderConfig: (provider, config) =>
    set((state) => ({
      aiProviders: {
        ...state.aiProviders,
        [provider]: {
          ...state.aiProviders[provider],
          ...config,
        },
      },
    })),

  setBlankingData: (data) => set({ blankingData: data }),

  setAssociationLinks: (links) => set({ associationLinks: links }),

  addAssociationLink: (link) =>
    set((state) => ({
      associationLinks: [...state.associationLinks, link],
    })),

  removeAssociationLink: (linkId) =>
    set((state) => ({
      associationLinks: state.associationLinks.filter((link) => link.id !== linkId),
    })),

  setSelectedBlanks: (blankIds) => set({ selectedBlanks: blankIds }),

  toggleSelectedBlank: (blankId) =>
    set((state) => ({
      selectedBlanks: state.selectedBlanks.includes(blankId)
        ? state.selectedBlanks.filter((id) => id !== blankId)
        : [...state.selectedBlanks, blankId],
    })),

  setRewriteResult: (result) => set({ rewriteResult: result }),

  setShowSettings: (show) => set({ showSettings: show }),

  setShowResults: (show) => set({ showResults: show }),

  reset: () => set(initialState),
}));
