/**
 * Association Feature Types
 */

export interface AssociationState {
  isActive: boolean;
  links: AssociationLinkItem[];
  selectedLink: string | null;
  knowledgeGraph: KnowledgeNode[];
}

export interface AssociationLinkItem {
  id: string;
  sourceFile: string;
  sourceBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sourceKeyword: string;
  targetNote: string;
  targetBlock?: string;
  targetKeyword?: string;
  relationshipType: 'related' | 'causes' | 'explains' | 'example' | 'contrast';
  strength: number; // 0-1
  createdAt: number;
  notes?: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'definition' | 'example' | 'application';
  connections: string[]; // IDs of connected nodes
  metadata?: Record<string, any>;
}

export interface AssociationConfig {
  autoSuggest: boolean;
  showRelationshipTypes: boolean;
  visualizeGraph: boolean;
  maxConnectionsPerNode: number;
}

export interface AssociationResult {
  totalLinks: number;
  uniqueNotes: number;
  averageStrength: number;
  graphDensity: number; // 0-1
}
