/**
 * Rewriting View Component
 */

import React, { useState, useEffect } from 'react';
import { RewritingStyle } from '../types/rewriting';
import '../styles/rewriting.css';

interface RewritingViewProps {
  originalText: string;
  onRewrite: (style: RewritingStyle) => Promise<string>;
}

export const RewritingView: React.FC<RewritingViewProps> = ({
  originalText,
  onRewrite,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<RewritingStyle | null>(null);
  const [rewrittenText, setRewrittenText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const rewritingOptions = [
    {
      id: 'summary' as RewritingStyle,
      label: 'Summary',
      description: 'Concise 2-3 sentence summary',
      icon: '📋',
    },
    {
      id: 'detailed' as RewritingStyle,
      label: 'Detailed',
      description: 'Comprehensive explanation with examples',
      icon: '📚',
    },
    {
      id: 'beginner' as RewritingStyle,
      label: 'Beginner',
      description: 'Simple terms for beginners',
      icon: '🌱',
    },
    {
      id: 'expert' as RewritingStyle,
      label: 'Expert',
      description: 'Advanced analysis and insights',
      icon: '🎓',
    },
    {
      id: 'story' as RewritingStyle,
      label: 'Story',
      description: 'Engaging narrative format',
      icon: '📖',
    },
    {
      id: 'report' as RewritingStyle,
      label: 'Report',
      description: 'Professional business format',
      icon: '📊',
    },
  ];

  const handleRewrite = async (style: RewritingStyle) => {
    setSelectedStyle(style);
    setIsLoading(true);

    try {
      const result = await onRewrite(style);
      setRewrittenText(result);
      setShowComparison(true);
    } catch (error) {
      console.error('Error rewriting:', error);
      setRewrittenText('Error generating rewritten content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const calculateReadabilityScore = (text: string): number => {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;

    let score = 100;
    if (avgWordsPerSentence < 10) score -= 10;
    if (avgWordsPerSentence > 25) score -= 20;
    if (avgWordsPerSentence > 35) score -= 30;

    return Math.max(0, Math.min(100, score));
  };

  const originalScore = calculateReadabilityScore(originalText);
  const rewrittenScore = calculateReadabilityScore(rewrittenText);

  return (
    <div className="rewriting-container">
      <div className="rewriting-header">
        <h3>Rewriting Mode - Multiple Perspectives</h3>
        <p className="rewriting-subtitle">Choose a style to rewrite the content</p>
      </div>

      <div className="rewriting-content">
        {!showComparison ? (
          <div className="rewriting-styles">
            <div className="styles-grid">
              {rewritingOptions.map(option => (
                <button
                  key={option.id}
                  className={`style-card ${selectedStyle === option.id && isLoading ? 'loading' : ''}`}
                  onClick={() => handleRewrite(option.id)}
                  disabled={isLoading}
                >
                  <div className="style-icon">{option.icon}</div>
                  <div className="style-label">{option.label}</div>
                  <div className="style-description">{option.description}</div>
                  {selectedStyle === option.id && isLoading && (
                    <div className="loading-spinner">
                      <div className="spinner"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rewriting-comparison">
            <div className="comparison-section original">
              <div className="section-header">
                <h4>Original</h4>
                <div className="metrics">
                  <span className="metric">
                    <span className="label">Length:</span> {originalText.length} chars
                  </span>
                  <span className="metric">
                    <span className="label">Readability:</span> {originalScore}%
                  </span>
                </div>
              </div>
              <div className="section-content">
                <p>{originalText}</p>
              </div>
              <button
                className="copy-btn"
                onClick={() => handleCopy(originalText)}
              >
                📋 Copy
              </button>
            </div>

            <div className="comparison-divider"></div>

            <div className="comparison-section rewritten">
              <div className="section-header">
                <h4>{selectedStyle && selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)}</h4>
                <div className="metrics">
                  <span className="metric">
                    <span className="label">Length:</span> {rewrittenText.length} chars
                  </span>
                  <span className="metric">
                    <span className="label">Readability:</span> {rewrittenScore}%
                  </span>
                </div>
              </div>
              <div className="section-content">
                <p>{rewrittenText}</p>
              </div>
              <button
                className="copy-btn"
                onClick={() => handleCopy(rewrittenText)}
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {showComparison && (
        <div className="rewriting-actions">
          <button
            className="action-btn back"
            onClick={() => {
              setShowComparison(false);
              setSelectedStyle(null);
              setRewrittenText('');
            }}
          >
            ← Try Another Style
          </button>
          <button
            className="action-btn export"
            onClick={() => handleCopy(rewrittenText)}
          >
            📥 Export Result
          </button>
        </div>
      )}
    </div>
  );
};

export default RewritingView;
