/**
 * Data Service - Handles local data persistence
 */

import { App, Vault } from 'obsidian';
import { BlankingData, AssociationLink } from '../types/ai';

export class DataService {
  private app: App;
  private vault: Vault;
  private dataDir = '.obsidian/plugins/infolearn-pro/data';

  constructor(app: App) {
    this.app = app;
    this.vault = app.vault;
  }

  /**
   * Initialize data directory
   */
  async initialize(): Promise<void> {
    try {
      const dataFolder = this.vault.getAbstractFileByPath(this.dataDir);
      if (!dataFolder) {
        await this.vault.createFolder(this.dataDir);
      }
    } catch (error) {
      console.error('Error initializing data directory:', error);
    }
  }

  /**
   * Save blanking data
   */
  async saveBlankingData(fileId: string, data: BlankingData): Promise<void> {
    try {
      const filePath = `${this.dataDir}/${fileId}-blanking.json`;
      await this.vault.adapter.write(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving blanking data:', error);
    }
  }

  /**
   * Load blanking data
   */
  async loadBlankingData(fileId: string): Promise<BlankingData | null> {
    try {
      const filePath = `${this.dataDir}/${fileId}-blanking.json`;
      const content = await this.vault.adapter.read(filePath);
      return JSON.parse(content);
    } catch (error) {
      console.warn('No blanking data found for file:', fileId);
      return null;
    }
  }

  /**
   * Save association links
   */
  async saveAssociationLinks(fileId: string, links: AssociationLink[]): Promise<void> {
    try {
      const filePath = `${this.dataDir}/${fileId}-associations.json`;
      await this.vault.adapter.write(filePath, JSON.stringify(links, null, 2));
    } catch (error) {
      console.error('Error saving association links:', error);
    }
  }

  /**
   * Load association links
   */
  async loadAssociationLinks(fileId: string): Promise<AssociationLink[]> {
    try {
      const filePath = `${this.dataDir}/${fileId}-associations.json`;
      const content = await this.vault.adapter.read(filePath);
      return JSON.parse(content);
    } catch (error) {
      console.warn('No association links found for file:', fileId);
      return [];
    }
  }

  /**
   * Save user settings
   */
  async saveSettings(settings: any): Promise<void> {
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
  async loadSettings(): Promise<any> {
    try {
      const filePath = `${this.dataDir}/settings.json`;
      const content = await this.vault.adapter.read(filePath);
      return JSON.parse(content);
    } catch (error) {
      console.warn('No settings found');
      return null;
    }
  }

  /**
   * Delete blanking data
   */
  async deleteBlankingData(fileId: string): Promise<void> {
    try {
      const filePath = `${this.dataDir}/${fileId}-blanking.json`;
      await this.vault.adapter.remove(filePath);
    } catch (error) {
      console.error('Error deleting blanking data:', error);
    }
  }

  /**
   * Delete association links
   */
  async deleteAssociationLinks(fileId: string): Promise<void> {
    try {
      const filePath = `${this.dataDir}/${fileId}-associations.json`;
      await this.vault.adapter.remove(filePath);
    } catch (error) {
      console.error('Error deleting association links:', error);
    }
  }

  /**
   * Get all files with blanking data
   */
  async getAllBlankingFiles(): Promise<string[]> {
    try {
      const files = await this.vault.adapter.list(this.dataDir);
      return files.files
        .filter((file: string) => file.endsWith('-blanking.json'))
        .map((file: string) => file.replace('-blanking.json', ''));
    } catch (error) {
      console.error('Error getting blanking files:', error);
      return [];
    }
  }
}
