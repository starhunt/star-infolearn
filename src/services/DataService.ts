/**
 * Data Service - Handles local data persistence (Simplified)
 * Focused on learning cards and FSRS system
 */

import { App, Vault } from 'obsidian';
import { LearningCard, Deck, StudyPreferences, DEFAULT_STUDY_PREFERENCES } from '../types/learning';
import { ReviewLog, DailyStats, FSRSParameters, StudySessionConfig, DEFAULT_FSRS_PARAMETERS, DEFAULT_STUDY_CONFIG } from '../types/fsrs';
import { DataServiceError } from '../types/errors';

export class DataService {
  private app: App;
  private vault: Vault;
  private dataDir = '.obsidian/plugins/star-infolearn/data';

  constructor(app: App) {
    this.app = app;
    this.vault = app.vault;
  }

  /**
   * Initialize data directory
   */
  async initialize(): Promise<void> {
    await this.ensureDir(this.dataDir);
    await this.ensureDir(`${this.dataDir}/cards`);
    await this.ensureDir(`${this.dataDir}/logs`);
    await this.ensureDir(`${this.dataDir}/stats`);
    await this.ensureDir(`${this.dataDir}/decks`);
  }

  // ============================================
  // Learning Cards - FSRS System
  // ============================================

  /**
   * Save a learning card
   */
  async saveLearningCard(card: LearningCard): Promise<void> {
    try {
      const filePath = `${this.dataDir}/cards/${card.id}.json`;
      await this.ensureDir(`${this.dataDir}/cards`);
      await this.vault.adapter.write(filePath, JSON.stringify(card, null, 2));
    } catch (error) {
      throw new DataServiceError(`Failed to save learning card: ${card.id}`, 'save', error);
    }
  }

  /**
   * Save multiple learning cards
   */
  async saveLearningCards(cards: LearningCard[]): Promise<void> {
    await Promise.all(cards.map(card => this.saveLearningCard(card)));
  }

  /**
   * Load a learning card by ID
   */
  async loadLearningCard(cardId: string): Promise<LearningCard | null> {
    try {
      const filePath = `${this.dataDir}/cards/${cardId}.json`;
      const content = await this.vault.adapter.read(filePath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Load all learning cards
   */
  async loadAllLearningCards(): Promise<LearningCard[]> {
    try {
      await this.ensureDir(`${this.dataDir}/cards`);
      const files = await this.vault.adapter.list(`${this.dataDir}/cards`);
      const cards: LearningCard[] = [];

      for (const file of files.files) {
        if (file.endsWith('.json')) {
          try {
            const content = await this.vault.adapter.read(file);
            cards.push(JSON.parse(content));
          } catch {
            console.warn(`Failed to load card from ${file}`);
          }
        }
      }

      return cards;
    } catch {
      return [];
    }
  }

  /**
   * Load learning cards for a specific source file
   */
  async loadCardsForSource(sourceFile: string): Promise<LearningCard[]> {
    const allCards = await this.loadAllLearningCards();
    return allCards.filter(card => card.sourceFile === sourceFile);
  }

  /**
   * Delete a learning card
   */
  async deleteLearningCard(cardId: string): Promise<void> {
    try {
      const filePath = `${this.dataDir}/cards/${cardId}.json`;
      await this.vault.adapter.remove(filePath);
    } catch (error) {
      throw new DataServiceError(`Failed to delete learning card: ${cardId}`, 'delete', error);
    }
  }

  /**
   * Update FSRS state for a card
   */
  async updateCardFSRSState(cardId: string, fsrsState: LearningCard['fsrsState']): Promise<void> {
    const card = await this.loadLearningCard(cardId);
    if (card) {
      card.fsrsState = fsrsState;
      card.updatedAt = Date.now();
      await this.saveLearningCard(card);
    }
  }

  // ============================================
  // Review Logs
  // ============================================

  /**
   * Save a review log entry
   */
  async saveReviewLog(log: ReviewLog): Promise<void> {
    try {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      const filePath = `${this.dataDir}/logs/${date}.json`;
      await this.ensureDir(`${this.dataDir}/logs`);

      let logs: ReviewLog[] = [];
      try {
        const content = await this.vault.adapter.read(filePath);
        logs = JSON.parse(content);
      } catch {
        // File doesn't exist yet
      }

      logs.push(log);
      await this.vault.adapter.write(filePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      throw new DataServiceError('Failed to save review log', 'save', error);
    }
  }

  /**
   * Load review logs for a specific date range
   */
  async loadReviewLogs(startDate: string, endDate: string): Promise<ReviewLog[]> {
    try {
      await this.ensureDir(`${this.dataDir}/logs`);
      const files = await this.vault.adapter.list(`${this.dataDir}/logs`);
      const logs: ReviewLog[] = [];

      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;

      for (const file of files.files) {
        if (file.endsWith('.json')) {
          const dateStr = file.split('/').pop()?.replace('.json', '') || '';
          const fileDate = new Date(dateStr).getTime();

          if (fileDate >= start && fileDate < end) {
            try {
              const content = await this.vault.adapter.read(file);
              logs.push(...JSON.parse(content));
            } catch {
              console.warn(`Failed to load logs from ${file}`);
            }
          }
        }
      }

      return logs.sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  }

  /**
   * Load review logs for a specific card
   */
  async loadCardReviewLogs(cardId: string, days: number = 30): Promise<ReviewLog[]> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allLogs = await this.loadReviewLogs(startDate, endDate);
    return allLogs.filter(log => log.cardId === cardId);
  }

  // ============================================
  // Daily Statistics
  // ============================================

  /**
   * Save daily stats
   */
  async saveDailyStats(stats: DailyStats): Promise<void> {
    try {
      const filePath = `${this.dataDir}/stats/${stats.date}.json`;
      await this.ensureDir(`${this.dataDir}/stats`);
      await this.vault.adapter.write(filePath, JSON.stringify(stats, null, 2));
    } catch (error) {
      throw new DataServiceError(`Failed to save daily stats: ${stats.date}`, 'save', error);
    }
  }

  /**
   * Load daily stats for a date range
   */
  async loadDailyStats(startDate: string, endDate: string): Promise<DailyStats[]> {
    try {
      await this.ensureDir(`${this.dataDir}/stats`);
      const files = await this.vault.adapter.list(`${this.dataDir}/stats`);
      const stats: DailyStats[] = [];

      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;

      for (const file of files.files) {
        if (file.endsWith('.json')) {
          const dateStr = file.split('/').pop()?.replace('.json', '') || '';
          const fileDate = new Date(dateStr).getTime();

          if (fileDate >= start && fileDate < end) {
            try {
              const content = await this.vault.adapter.read(file);
              stats.push(JSON.parse(content));
            } catch {
              console.warn(`Failed to load stats from ${file}`);
            }
          }
        }
      }

      return stats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch {
      return [];
    }
  }

  // ============================================
  // Decks
  // ============================================

  /**
   * Save a deck
   */
  async saveDeck(deck: Deck): Promise<void> {
    try {
      const filePath = `${this.dataDir}/decks/${deck.id}.json`;
      await this.ensureDir(`${this.dataDir}/decks`);
      await this.vault.adapter.write(filePath, JSON.stringify(deck, null, 2));
    } catch (error) {
      throw new DataServiceError(`Failed to save deck: ${deck.id}`, 'save', error);
    }
  }

  /**
   * Load a deck by ID
   */
  async loadDeck(deckId: string): Promise<Deck | null> {
    try {
      const filePath = `${this.dataDir}/decks/${deckId}.json`;
      const content = await this.vault.adapter.read(filePath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Load all decks
   */
  async loadAllDecks(): Promise<Deck[]> {
    try {
      await this.ensureDir(`${this.dataDir}/decks`);
      const files = await this.vault.adapter.list(`${this.dataDir}/decks`);
      const decks: Deck[] = [];

      for (const file of files.files) {
        if (file.endsWith('.json')) {
          try {
            const content = await this.vault.adapter.read(file);
            decks.push(JSON.parse(content));
          } catch {
            console.warn(`Failed to load deck from ${file}`);
          }
        }
      }

      return decks;
    } catch {
      return [];
    }
  }

  /**
   * Delete a deck
   */
  async deleteDeck(deckId: string): Promise<void> {
    try {
      const filePath = `${this.dataDir}/decks/${deckId}.json`;
      await this.vault.adapter.remove(filePath);
    } catch (error) {
      throw new DataServiceError(`Failed to delete deck: ${deckId}`, 'delete', error);
    }
  }

  // ============================================
  // Study Preferences & FSRS Config
  // ============================================

  /**
   * Save study preferences
   */
  async saveStudyPreferences(prefs: StudyPreferences): Promise<void> {
    try {
      const filePath = `${this.dataDir}/study-preferences.json`;
      await this.vault.adapter.write(filePath, JSON.stringify(prefs, null, 2));
    } catch (error) {
      throw new DataServiceError('Failed to save study preferences', 'save', error);
    }
  }

  /**
   * Load study preferences
   */
  async loadStudyPreferences(): Promise<StudyPreferences> {
    try {
      const filePath = `${this.dataDir}/study-preferences.json`;
      const content = await this.vault.adapter.read(filePath);
      return { ...DEFAULT_STUDY_PREFERENCES, ...JSON.parse(content) };
    } catch {
      return { ...DEFAULT_STUDY_PREFERENCES };
    }
  }

  /**
   * Save FSRS parameters
   */
  async saveFSRSParameters(params: FSRSParameters): Promise<void> {
    try {
      const filePath = `${this.dataDir}/fsrs-parameters.json`;
      await this.vault.adapter.write(filePath, JSON.stringify(params, null, 2));
    } catch (error) {
      throw new DataServiceError('Failed to save FSRS parameters', 'save', error);
    }
  }

  /**
   * Load FSRS parameters
   */
  async loadFSRSParameters(): Promise<FSRSParameters> {
    try {
      const filePath = `${this.dataDir}/fsrs-parameters.json`;
      const content = await this.vault.adapter.read(filePath);
      return { ...DEFAULT_FSRS_PARAMETERS, ...JSON.parse(content) };
    } catch {
      return { ...DEFAULT_FSRS_PARAMETERS };
    }
  }

  /**
   * Save study session config
   */
  async saveStudyConfig(config: StudySessionConfig): Promise<void> {
    try {
      const filePath = `${this.dataDir}/study-config.json`;
      await this.vault.adapter.write(filePath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new DataServiceError('Failed to save study config', 'save', error);
    }
  }

  /**
   * Load study session config
   */
  async loadStudyConfig(): Promise<StudySessionConfig> {
    try {
      const filePath = `${this.dataDir}/study-config.json`;
      const content = await this.vault.adapter.read(filePath);
      return { ...DEFAULT_STUDY_CONFIG, ...JSON.parse(content) };
    } catch {
      return { ...DEFAULT_STUDY_CONFIG };
    }
  }

  /**
   * Save user settings
   */
  async saveSettings(settings: unknown): Promise<void> {
    try {
      const filePath = `${this.dataDir}/settings.json`;
      await this.vault.adapter.write(filePath, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Load user settings
   */
  async loadSettings(): Promise<unknown> {
    try {
      const filePath = `${this.dataDir}/settings.json`;
      const content = await this.vault.adapter.read(filePath);
      return JSON.parse(content);
    } catch (error) {
      console.warn('No settings found');
      return null;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Ensure a directory exists
   */
  private async ensureDir(path: string): Promise<void> {
    try {
      const folder = this.vault.getAbstractFileByPath(path);
      if (!folder) {
        await this.vault.createFolder(path);
      }
    } catch {
      // Folder might already exist
    }
  }

  /**
   * Export all learning data for backup
   */
  async exportAllData(): Promise<{
    cards: LearningCard[];
    decks: Deck[];
    preferences: StudyPreferences;
    fsrsParams: FSRSParameters;
    studyConfig: StudySessionConfig;
  }> {
    const [cards, decks, preferences, fsrsParams, studyConfig] = await Promise.all([
      this.loadAllLearningCards(),
      this.loadAllDecks(),
      this.loadStudyPreferences(),
      this.loadFSRSParameters(),
      this.loadStudyConfig(),
    ]);

    return {
      cards,
      decks,
      preferences,
      fsrsParams,
      studyConfig,
    };
  }

  /**
   * Import learning data from backup
   */
  async importData(data: {
    cards?: LearningCard[];
    decks?: Deck[];
    preferences?: StudyPreferences;
    fsrsParams?: FSRSParameters;
    studyConfig?: StudySessionConfig;
  }): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (data.cards) {
      tasks.push(this.saveLearningCards(data.cards));
    }
    if (data.decks) {
      for (const deck of data.decks) {
        tasks.push(this.saveDeck(deck));
      }
    }
    if (data.preferences) {
      tasks.push(this.saveStudyPreferences(data.preferences));
    }
    if (data.fsrsParams) {
      tasks.push(this.saveFSRSParameters(data.fsrsParams));
    }
    if (data.studyConfig) {
      tasks.push(this.saveStudyConfig(data.studyConfig));
    }

    await Promise.all(tasks);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalCards: number;
    totalDecks: number;
    totalReviewLogs: number;
  }> {
    const [cards, decks] = await Promise.all([
      this.loadAllLearningCards(),
      this.loadAllDecks(),
    ]);

    // Count review logs
    let totalReviewLogs = 0;
    try {
      await this.ensureDir(`${this.dataDir}/logs`);
      const files = await this.vault.adapter.list(`${this.dataDir}/logs`);
      for (const file of files.files) {
        if (file.endsWith('.json')) {
          try {
            const content = await this.vault.adapter.read(file);
            totalReviewLogs += JSON.parse(content).length;
          } catch {
            // Skip corrupted files
          }
        }
      }
    } catch {
      // Logs directory doesn't exist
    }

    return {
      totalCards: cards.length,
      totalDecks: decks.length,
      totalReviewLogs,
    };
  }
}
