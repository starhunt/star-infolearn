/**
 * Association Service - Handles knowledge association and linking
 */

import { AIService } from './AIService';
import { DataService } from './DataService';
import { AssociationLinkItem, KnowledgeNode, AssociationConfig, AssociationResult } from '../types/association';

export class AssociationService {
  private aiService: AIService;
  private dataService: DataService;
  private config: AssociationConfig;

  constructor(aiService: AIService, dataService: DataService, config?: Partial<AssociationConfig>) {
    this.aiService = aiService;
    this.dataService = dataService;
    this.config = {
      autoSuggest: true,
      showRelationshipTypes: true,
      visualizeGraph: true,
      maxConnectionsPerNode: 5,
      ...config,
    };
  }

  /**
   * Create association link
   */
  async createLink(
    sourceFile: string,
    sourceBounds: any,
    sourceKeyword: string,
    targetNote: string,
    targetKeyword?: string,
    relationshipType: 'related' | 'causes' | 'explains' | 'example' | 'contrast' = 'related'
  ): Promise<AssociationLinkItem> {
    const link: AssociationLinkItem = {
      id: `link-${Date.now()}`,
      sourceFile,
      sourceBounds,
      sourceKeyword,
      targetNote,
      targetKeyword,
      relationshipType,
      strength: 0.7 + Math.random() * 0.3,
      createdAt: Date.now(),
    };

    // Save link
    const existingLinks = await this.dataService.loadAssociationLinks(sourceFile);
    await this.dataService.saveAssociationLinks(sourceFile, [...existingLinks, link]);

    return link;
  }

  /**
   * Suggest associations
   */
  async suggestAssociations(keyword: string, availableNotes: string[]): Promise<string[]> {
    if (!this.config.autoSuggest) {
      return [];
    }

    // Mock suggestion - in real implementation would use AI
    return availableNotes.filter(note =>
      note.toLowerCase().includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(note.toLowerCase())
    );
  }

  /**
   * Build knowledge graph
   */
  buildKnowledgeGraph(links: AssociationLinkItem[]): KnowledgeNode[] {
    const nodes: Map<string, KnowledgeNode> = new Map();

    // Create nodes from links
    links.forEach(link => {
      const sourceId = `${link.sourceFile}-${link.sourceKeyword}`;
      const targetId = `${link.targetNote}-${link.targetKeyword || 'main'}`;

      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, {
          id: sourceId,
          label: link.sourceKeyword,
          type: 'concept',
          connections: [],
        });
      }

      if (!nodes.has(targetId)) {
        nodes.set(targetId, {
          id: targetId,
          label: link.targetKeyword || link.targetNote,
          type: 'definition',
          connections: [],
        });
      }

      // Add connections
      const sourceNode = nodes.get(sourceId)!;
      const targetNode = nodes.get(targetId)!;

      if (!sourceNode.connections.includes(targetId)) {
        sourceNode.connections.push(targetId);
      }
      if (!targetNode.connections.includes(sourceId)) {
        targetNode.connections.push(sourceId);
      }
    });

    return Array.from(nodes.values());
  }

  /**
   * Calculate association results
   */
  calculateResults(links: AssociationLinkItem[], nodes: KnowledgeNode[]): AssociationResult {
    const uniqueNotes = new Set(links.map(l => l.targetNote)).size;
    const averageStrength = links.length > 0
      ? links.reduce((sum, link) => sum + link.strength, 0) / links.length
      : 0;

    // Calculate graph density
    const maxConnections = nodes.length > 1 ? (nodes.length * (nodes.length - 1)) / 2 : 1;
    const actualConnections = nodes.reduce((sum, node) => sum + node.connections.length, 0) / 2;
    const graphDensity = actualConnections / maxConnections;

    return {
      totalLinks: links.length,
      uniqueNotes,
      averageStrength,
      graphDensity,
    };
  }

  /**
   * Get relationship type description
   */
  getRelationshipDescription(type: string): string {
    const descriptions: Record<string, string> = {
      related: 'Related concept',
      causes: 'Causes or leads to',
      explains: 'Explains or defines',
      example: 'Example of',
      contrast: 'Contrasts with',
    };

    return descriptions[type] || 'Related to';
  }

  /**
   * Delete link
   */
  async deleteLink(sourceFile: string, linkId: string): Promise<void> {
    const links = await this.dataService.loadAssociationLinks(sourceFile);
    const filtered = links.filter(l => l.id !== linkId);
    await this.dataService.saveAssociationLinks(sourceFile, filtered);
  }

  /**
   * Get all links for file
   */
  async getLinksForFile(fileId: string): Promise<AssociationLinkItem[]> {
    const links = await this.dataService.loadAssociationLinks(fileId);
    return links as any as AssociationLinkItem[];
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<AssociationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current config
   */
  getConfig(): AssociationConfig {
    return this.config;
  }

  /**
   * Get mock associations
   */
  getMockAssociations(): AssociationLinkItem[] {
    const mockLinks: AssociationLinkItem[] = [
      {
        id: 'link-1',
        sourceFile: 'infographic-1',
        sourceBounds: { x: 10, y: 10, width: 80, height: 20 },
        sourceKeyword: 'learning',
        targetNote: 'Learning Theory',
        targetKeyword: 'cognitive',
        relationshipType: 'related',
        strength: 0.8,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'link-2',
        sourceFile: 'infographic-1',
        sourceBounds: { x: 100, y: 10, width: 100, height: 20 },
        sourceKeyword: 'infographic',
        targetNote: 'Visual Design',
        targetKeyword: 'visualization',
        relationshipType: 'explains',
        strength: 0.75,
        createdAt: Date.now() - 172800000,
      },
    ];
    return mockLinks;
  }
}
