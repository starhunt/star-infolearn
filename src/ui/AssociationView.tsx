/**
 * Association View Component
 */

import React, { useState, useEffect } from 'react';
import { AssociationLinkItem } from '../types/association';
import '../styles/association.css';

interface AssociationViewProps {
  links: AssociationLinkItem[];
  onCreateLink: (link: Partial<AssociationLinkItem>) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}

export const AssociationView: React.FC<AssociationViewProps> = ({
  links,
  onCreateLink,
  onDeleteLink,
}) => {
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [newLink, setNewLink] = useState({
    sourceKeyword: '',
    targetNote: '',
    targetKeyword: '',
    relationshipType: 'related' as const,
    notes: '',
  });

  const relationshipTypes = [
    { id: 'related', label: 'Related', icon: '🔗' },
    { id: 'causes', label: 'Causes', icon: '→' },
    { id: 'explains', label: 'Explains', icon: '💡' },
    { id: 'example', label: 'Example', icon: '📝' },
    { id: 'contrast', label: 'Contrast', icon: '⚖️' },
  ];

  const handleCreateLink = async () => {
    if (newLink.sourceKeyword && newLink.targetNote) {
      await onCreateLink({
        sourceKeyword: newLink.sourceKeyword,
        targetNote: newLink.targetNote,
        targetKeyword: newLink.targetKeyword,
        relationshipType: newLink.relationshipType as any,
        notes: newLink.notes,
      });

      setNewLink({
        sourceKeyword: '',
        targetNote: '',
        targetKeyword: '',
        relationshipType: 'related',
        notes: '',
      });
      setShowNewLinkForm(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    await onDeleteLink(linkId);
    if (selectedLink === linkId) {
      setSelectedLink(null);
    }
  };

  const getRelationshipIcon = (type: string) => {
    const rel = relationshipTypes.find(r => r.id === type);
    return rel?.icon || '🔗';
  };

  const groupedLinks = links.reduce((acc, link) => {
    const key = link.sourceKeyword;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(link);
    return acc;
  }, {} as Record<string, AssociationLinkItem[]>);

  return (
    <div className="association-container">
      <div className="association-header">
        <h3>Association Mode - Knowledge Mapping</h3>
        <button
          className="new-link-btn"
          onClick={() => setShowNewLinkForm(!showNewLinkForm)}
        >
          + New Link
        </button>
      </div>

      <div className="association-content">
        {showNewLinkForm && (
          <div className="new-link-form">
            <div className="form-group">
              <label>Source Keyword</label>
              <input
                type="text"
                placeholder="e.g., learning"
                value={newLink.sourceKeyword}
                onChange={e => setNewLink({ ...newLink, sourceKeyword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Relationship Type</label>
              <div className="relationship-types">
                {relationshipTypes.map(rel => (
                  <button
                    key={rel.id}
                    className={`rel-type-btn ${newLink.relationshipType === rel.id ? 'active' : ''}`}
                    onClick={() => setNewLink({ ...newLink, relationshipType: rel.id as any })}
                    title={rel.label}
                  >
                    {rel.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Target Note</label>
              <input
                type="text"
                placeholder="e.g., Learning Theory"
                value={newLink.targetNote}
                onChange={e => setNewLink({ ...newLink, targetNote: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Target Keyword (Optional)</label>
              <input
                type="text"
                placeholder="e.g., cognitive"
                value={newLink.targetKeyword}
                onChange={e => setNewLink({ ...newLink, targetKeyword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                placeholder="Add any notes about this connection..."
                value={newLink.notes}
                onChange={e => setNewLink({ ...newLink, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button
                className="btn-primary"
                onClick={handleCreateLink}
              >
                Create Link
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowNewLinkForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="links-container">
          {Object.keys(groupedLinks).length === 0 ? (
            <div className="empty-state">
              <p>No associations yet. Create your first knowledge link!</p>
            </div>
          ) : (
            Object.entries(groupedLinks).map(([keyword, keywordLinks]) => (
              <div key={keyword} className="keyword-group">
                <div className="keyword-header">
                  <h4>{keyword}</h4>
                  <span className="count">{keywordLinks.length}</span>
                </div>

                <div className="links-list">
                  {keywordLinks.map(link => (
                    <div
                      key={link.id}
                      className={`link-item ${selectedLink === link.id ? 'selected' : ''}`}
                      onClick={() => setSelectedLink(link.id)}
                    >
                      <div className="link-main">
                        <span className="rel-icon">
                          {getRelationshipIcon(link.relationshipType)}
                        </span>
                        <div className="link-info">
                          <div className="link-target">{link.targetNote}</div>
                          {link.targetKeyword && (
                            <div className="link-keyword">{link.targetKeyword}</div>
                          )}
                        </div>
                        <div className="link-strength">
                          <div className="strength-bar">
                            <div
                              className="strength-fill"
                              style={{ width: `${link.strength * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {selectedLink === link.id && (
                        <div className="link-details">
                          <div className="detail-row">
                            <span className="label">Relationship:</span>
                            <span className="value">{link.relationshipType}</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">Strength:</span>
                            <span className="value">{Math.round(link.strength * 100)}%</span>
                          </div>
                          {link.notes && (
                            <div className="detail-row">
                              <span className="label">Notes:</span>
                              <span className="value">{link.notes}</span>
                            </div>
                          )}
                          <div className="detail-row">
                            <span className="label">Created:</span>
                            <span className="value">
                              {new Date(link.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="association-stats">
        <div className="stat-item">
          <span className="stat-label">Total Links:</span>
          <span className="stat-value">{links.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Unique Notes:</span>
          <span className="stat-value">{new Set(links.map(l => l.targetNote)).size}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg Strength:</span>
          <span className="stat-value">
            {links.length > 0
              ? (links.reduce((sum, l) => sum + l.strength, 0) / links.length * 100).toFixed(0)
              : 0}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssociationView;
