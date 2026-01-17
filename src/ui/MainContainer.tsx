/**
 * Main Container Component - Orchestrates all features
 */

import React, { useState, useEffect } from 'react';
import { BlankingView } from './BlankingView';
import { RewritingView } from './RewritingView';
import { AssociationView } from './AssociationView';
import { AISettingsPanel } from './AISettingsPanel';
import { useAppStore } from '../store/appStore';
import '../styles/main.css';

interface MainContainerProps {
  onRewrite: (text: string, style: string) => Promise<string>;
  onIdentifyKeywords: (text: string) => Promise<any[]>;
  onCreateAssociation: (link: any) => Promise<void>;
  onDeleteAssociation: (linkId: string) => Promise<void>;
  onUpdateAIProvider: (provider: string, config: any) => Promise<void>;
  onTestAIConnection: (provider: string) => Promise<boolean>;
}

export const MainContainer: React.FC<MainContainerProps> = ({
  onRewrite,
  onIdentifyKeywords,
  onCreateAssociation,
  onDeleteAssociation,
  onUpdateAIProvider,
  onTestAIConnection,
}) => {
  const [currentMode, setCurrentMode] = useState<'blanking' | 'rewriting' | 'association' | 'settings' | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [associationLinks, setAssociationLinks] = useState<any[]>([]);
  const appStore = useAppStore();

  useEffect(() => {
    setCurrentMode(appStore.currentMode);
  }, [appStore.currentMode]);

  const handleModeChange = (mode: 'blanking' | 'rewriting' | 'association' | 'settings' | null) => {
    setCurrentMode(mode);
    useAppStore.setState({ currentMode: mode as any });
  };

  const handleSelectText = (text: string) => {
    setSelectedText(text);
  };

  return (
    <div className="main-container">
      {/* Header */}
      <div className="main-header">
        <div className="header-left">
          <h1 className="app-title">📚 InfoLearn Pro</h1>
          <p className="app-subtitle">Advanced Infographic Learning Tool</p>
        </div>
        <div className="header-right">
          <span className="current-mode">
            {currentMode ? `Mode: ${currentMode.toUpperCase()}` : 'Ready'}
          </span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${currentMode === 'blanking' ? 'active' : ''}`}
          onClick={() => handleModeChange('blanking')}
          title="Fill-in-the-blank learning"
        >
          <span className="mode-icon">📝</span>
          <span className="mode-name">Blanking</span>
        </button>
        <button
          className={`mode-btn ${currentMode === 'rewriting' ? 'active' : ''}`}
          onClick={() => handleModeChange('rewriting')}
          title="Rewrite content in different styles"
        >
          <span className="mode-icon">✏️</span>
          <span className="mode-name">Rewriting</span>
        </button>
        <button
          className={`mode-btn ${currentMode === 'association' ? 'active' : ''}`}
          onClick={() => handleModeChange('association')}
          title="Create knowledge connections"
        >
          <span className="mode-icon">🔗</span>
          <span className="mode-name">Association</span>
        </button>
        <button
          className={`mode-btn ${currentMode === 'settings' ? 'active' : ''}`}
          onClick={() => handleModeChange('settings')}
          title="Configure AI providers"
        >
          <span className="mode-icon">⚙️</span>
          <span className="mode-name">Settings</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {currentMode === 'blanking' && selectedText && (
          <BlankingView
            text={selectedText}
            onIdentifyKeywords={onIdentifyKeywords}
          />
        )}

        {currentMode === 'rewriting' && selectedText && (
          <RewritingView
            originalText={selectedText}
            onRewrite={onRewrite}
          />
        )}

        {currentMode === 'association' && (
          <AssociationView
            links={associationLinks}
            onCreateLink={onCreateAssociation}
            onDeleteLink={onDeleteAssociation}
          />
        )}

        {currentMode === 'settings' && (
          <AISettingsPanel
            providers={appStore.aiProviders}
            defaultProvider={appStore.currentAIProvider}
            onUpdateProvider={onUpdateAIProvider}
            onTestConnection={onTestAIConnection}
          />
        )}

        {!currentMode && (
          <div className="welcome-screen">
            <div className="welcome-content">
              <h2>Welcome to InfoLearn Pro</h2>
              <p>Choose a mode to get started:</p>
              <div className="feature-grid">
                <div className="feature-card">
                  <div className="feature-icon">📝</div>
                  <h3>Blanking</h3>
                  <p>Interactive fill-in-the-blank exercises with AI-powered keyword identification</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">✏️</div>
                  <h3>Rewriting</h3>
                  <p>Rewrite content in 6 different styles: Summary, Detailed, Beginner, Expert, Story, Report</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔗</div>
                  <h3>Association</h3>
                  <p>Build knowledge graphs by creating meaningful connections between concepts</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⚙️</div>
                  <h3>Settings</h3>
                  <p>Configure multiple AI providers: OpenAI, Anthropic, Gemini, Grok, Zhipu GLM</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentMode && !selectedText && currentMode !== 'association' && currentMode !== 'settings' && (
          <div className="empty-state">
            <p>Select or paste text to get started</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="main-footer">
        <div className="footer-stats">
          <span className="stat">AI Provider: {appStore.currentAIProvider}</span>
          <span className="stat">Status: {appStore.isLoading ? '⏳ Processing...' : '✓ Ready'}</span>
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
