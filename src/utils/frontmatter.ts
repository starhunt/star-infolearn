/**
 * Frontmatter Utilities for Star InfoLearn
 * Handles tracking card generation status in note frontmatter
 */

import { App, TFile } from 'obsidian';

/** Frontmatter property name for tracking card generation */
export const FRONTMATTER_KEY = 'sil-cards-generated';

/**
 * Check if a file has already had cards generated
 */
export function hasGeneratedCards(file: TFile, app: App): boolean {
  const cache = app.metadataCache.getFileCache(file);
  const frontmatter = cache?.frontmatter;

  if (!frontmatter) return false;

  return !!frontmatter[FRONTMATTER_KEY];
}

/**
 * Get the date when cards were generated for a file
 */
export function getGenerationDate(file: TFile, app: App): Date | null {
  const cache = app.metadataCache.getFileCache(file);
  const frontmatter = cache?.frontmatter;

  if (!frontmatter || !frontmatter[FRONTMATTER_KEY]) return null;

  const dateStr = frontmatter[FRONTMATTER_KEY];
  if (typeof dateStr === 'string') {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Mark a file as having cards generated
 * Adds sil-cards-generated: "YYYY-MM-DD" to frontmatter
 */
export async function markAsGenerated(file: TFile, app: App): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter[FRONTMATTER_KEY] = today;
  });
}

/**
 * Remove the generation mark from a file
 */
export async function clearGenerationMark(file: TFile, app: App): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    delete frontmatter[FRONTMATTER_KEY];
  });
}

/**
 * Get all markdown files in a folder (optionally including subfolders)
 */
export function getMarkdownFilesInFolder(
  app: App,
  folderPath: string,
  includeSubfolders: boolean = false
): TFile[] {
  const files: TFile[] = [];
  const folder = app.vault.getAbstractFileByPath(folderPath);

  if (!folder) return files;

  const allFiles = app.vault.getMarkdownFiles();

  for (const file of allFiles) {
    if (includeSubfolders) {
      // Check if file is in folder or any subfolder
      if (file.path.startsWith(folderPath + '/') || file.path === folderPath) {
        files.push(file);
      }
    } else {
      // Check if file is directly in folder (not in subfolders)
      const fileFolder = file.parent?.path || '';
      if (fileFolder === folderPath || (folderPath === '' && !fileFolder.includes('/'))) {
        files.push(file);
      }
    }
  }

  return files;
}

/**
 * Filter files by creation/modification date range
 */
export function filterFilesByDateRange(
  files: TFile[],
  from: Date | null,
  to: Date | null
): TFile[] {
  if (!from && !to) return files;

  return files.filter(file => {
    const fileDate = new Date(file.stat.mtime);

    if (from && fileDate < from) return false;
    if (to) {
      // Set to end of day for inclusive comparison
      const toEnd = new Date(to);
      toEnd.setHours(23, 59, 59, 999);
      if (fileDate > toEnd) return false;
    }

    return true;
  });
}

/**
 * Filter out files that already have generated cards
 */
export function filterUngenerated(files: TFile[], app: App): TFile[] {
  return files.filter(file => !hasGeneratedCards(file, app));
}

/**
 * Get note info for display
 */
export interface NoteInfo {
  file: TFile;
  path: string;
  name: string;
  folder: string;
  hasGeneratedCards: boolean;
  generationDate: Date | null;
  modifiedDate: Date;
  wordCount: number;
}

export async function getNoteInfo(file: TFile, app: App): Promise<NoteInfo> {
  const content = await app.vault.cachedRead(file);
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    file,
    path: file.path,
    name: file.basename,
    folder: file.parent?.path || '',
    hasGeneratedCards: hasGeneratedCards(file, app),
    generationDate: getGenerationDate(file, app),
    modifiedDate: new Date(file.stat.mtime),
    wordCount,
  };
}

/**
 * Get all folders in the vault
 */
export function getAllFolders(app: App): string[] {
  const folders = new Set<string>();
  folders.add(''); // Root folder

  const allFiles = app.vault.getAllLoadedFiles();

  for (const file of allFiles) {
    if ('children' in file) {
      // This is a folder
      folders.add(file.path);
    }
  }

  return Array.from(folders).sort();
}
