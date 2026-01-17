/**
 * AI Settings Panel Component - Improved with persistent state
 */

import React, { useState, useEffect } from 'react';
import { AIProvider, AIProviderConfig } from '../types/ai';
import '../styles/settings.css';

interface AISettingsPanelProps {
  providers: Record<AIProvider, AIProviderConfig>;
  defaultProvider: AIProvider;
  onUpdateProvider: (provider: AIProvider, config: Partial<AIProviderConfig>) => Promise<void>;
  onTestConnection: (provider: AIProvider) => Promise<boolean>;
  onSetDefaultProvider: (provider: AIProvider) => Promise<void>;
}

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({
  providers,
  defaultProvider,
  onUpdateProvider,
  onTestConnection,
  onSetDefaultProvider,
}) => {
  const [activeTab, setActiveTab] = useState<AIProvider>(defaultProvider);
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null);
  const [testResults, setTestResults] = useState<Record<AIProvider, boolean | null>>({
    openai: null,
    anthropic: null,
    gemini: null,
    grok: null,
    zhipu: null,
  });
  
  // Use local state to prevent API key loss
  const [localProviders, setLocalProviders] = useState<Record<AIProvider, AIProviderConfig>>(providers);
  const [localDefaultProvider, setLocalDefaultProvider] = useState<AIProvider>(defaultProvider);

  useEffect(() => {
    setLocalProviders(providers);
  }, [providers]);

  useEffect(() => {
    setLocalDefaultProvider(defaultProvider);
  }, [defaultProvider]);

  const providerInfo: Record<AIProvider, { label: string; icon: string; description: string; defaultModel: string }> = {
    openai: {
      label: 'OpenAI',
      icon: '🤖',
      description: 'GPT-4 Turbo, GPT-4, GPT-3.5 Turbo',
      defaultModel: 'gpt-4-turbo',
    },
    anthropic: {
      label: 'Anthropic',
      icon: '🧠',
      description: 'Claude 3 Opus, Sonnet, Haiku',
      defaultModel: 'claude-3-opus',
    },
    gemini: {
      label: 'Google Gemini',
      icon: '✨',
      description: 'Gemini 2.0 Flash, Pro, Ultra',
      defaultModel: 'gemini-2.0-flash',
    },
    grok: {
      label: 'xAI Grok',
      icon: '⚡',
      description: 'Grok-3, Grok-2, Grok-1',
      defaultModel: 'grok-3',
    },
    zhipu: {
      label: 'Zhipu GLM',
      icon: '🌐',
      description: 'GLM-4.7 (코딩플랜), GLM-4, GLM-3',
      defaultModel: 'glm-4.7',
    },
  };

  const handleApiKeyChange = (provider: AIProvider, value: string) => {
    setLocalProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey: value,
      },
    }));
  };

  const handleModelChange = (provider: AIProvider, model: string) => {
    setLocalProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        model,
      },
    }));
  };

  const handleSaveApiKey = async (provider: AIProvider) => {
    await onUpdateProvider(provider, {
      apiKey: localProviders[provider].apiKey,
      model: localProviders[provider].model,
    });
  };

  const handleTestConnection = async (provider: AIProvider) => {
    setTestingProvider(provider);
    try {
      const result = await onTestConnection(provider);
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults(prev => ({ ...prev, [provider]: false }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSetDefaultProvider = async (provider: AIProvider) => {
    if (localProviders[provider]?.apiKey) {
      await onSetDefaultProvider(provider);
      setLocalDefaultProvider(provider);
    }
  };

  return (
    <div className="ai-settings-panel">
      <div className="settings-header">
        <h3>🤖 AI Provider Settings</h3>
        <p className="settings-subtitle">Configure your AI providers and API keys</p>
      </div>

      <div className="provider-tabs">
        {(Object.keys(providerInfo) as AIProvider[]).map(provider => (
          <button
            key={provider}
            className={`provider-tab ${activeTab === provider ? 'active' : ''} ${
              localDefaultProvider === provider ? 'default' : ''
            }`}
            onClick={() => setActiveTab(provider)}
            title={`${providerInfo[provider].label}${localDefaultProvider === provider ? ' (Default)' : ''}`}
          >
            <span className="tab-icon">{providerInfo[provider].icon}</span>
            <span className="tab-label">{providerInfo[provider].label}</span>
            {testResults[provider] !== null && (
              <span className={`test-status ${testResults[provider] ? 'success' : 'error'}`}>
                {testResults[provider] ? '✓' : '✗'}
              </span>
            )}
            {localDefaultProvider === provider && (
              <span className="default-badge">DEFAULT</span>
            )}
          </button>
        ))}
      </div>

      <div className="provider-content">
        {(Object.keys(providerInfo) as AIProvider[]).map(provider => (
          activeTab === provider && (
            <div key={provider} className="provider-settings">
              <div className="provider-header">
                <div className="provider-info">
                  <h4>{providerInfo[provider].label}</h4>
                  <p className="provider-description">{providerInfo[provider].description}</p>
                </div>
              </div>

              <div className="settings-form">
                {/* API Key */}
                <div className="form-group">
                  <label>API Key</label>
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder={`Enter your ${provider} API key`}
                      value={localProviders[provider]?.apiKey || ''}
                      onChange={e => handleApiKeyChange(provider, e.target.value)}
                      className="api-key-input"
                    />
                    <button
                      className="save-btn"
                      onClick={() => handleSaveApiKey(provider)}
                      disabled={localProviders[provider]?.apiKey === providers[provider]?.apiKey}
                    >
                      Save
                    </button>
                  </div>
                  <p className="form-hint">
                    Your API key is stored locally and never sent to external servers.
                  </p>
                </div>

                {/* Model Selection */}
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    placeholder={`e.g., ${providerInfo[provider].defaultModel}`}
                    value={localProviders[provider]?.model || ''}
                    onChange={e => handleModelChange(provider, e.target.value)}
                    className="model-input"
                  />
                  <p className="form-hint">
                    Specify the model version to use. Leave blank for default.
                  </p>
                </div>

                {/* Test Connection */}
                <div className="form-group">
                  <button
                    className="test-btn"
                    onClick={() => handleTestConnection(provider)}
                    disabled={testingProvider !== null || !localProviders[provider]?.apiKey}
                  >
                    {testingProvider === provider ? (
                      <>
                        <span className="spinner-small"></span>
                        Testing...
                      </>
                    ) : testResults[provider] === true ? (
                      <>✓ Connection Successful</>
                    ) : testResults[provider] === false ? (
                      <>✗ Connection Failed</>
                    ) : (
                      <>🔗 Test Connection</>
                    )}
                  </button>

                  {testResults[provider] !== null && (
                    <div className={`test-message ${testResults[provider] ? 'success' : 'error'}`}>
                      {testResults[provider]
                        ? `✓ Successfully connected to ${provider}`
                        : `✗ Failed to connect. Please check your API key.`}
                    </div>
                  )}
                </div>

                {/* Set as Default */}
                <div className="form-group">
                  <button
                    className={`default-btn ${localDefaultProvider === provider ? 'active' : ''}`}
                    onClick={() => handleSetDefaultProvider(provider)}
                    disabled={!localProviders[provider]?.apiKey}
                  >
                    {localDefaultProvider === provider ? '✓ Default Provider' : 'Set as Default'}
                  </button>
                  <p className="form-hint">
                    This provider will be used for all AI operations.
                  </p>
                </div>

                {/* Status */}
                <div className="provider-status">
                  <div className="status-item">
                    <span className="status-label">API Key Status:</span>
                    <span className={`status-value ${localProviders[provider]?.apiKey ? 'configured' : 'missing'}`}>
                      {localProviders[provider]?.apiKey ? '✓ Configured' : '⚠ Not Set'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Model:</span>
                    <span className="status-value">{localProviders[provider]?.model || 'Default'}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Default:</span>
                    <span className={`status-value ${localDefaultProvider === provider ? 'active' : ''}`}>
                      {localDefaultProvider === provider ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      <div className="settings-footer">
        <div className="footer-info">
          <p>💡 Tip: Set up multiple providers for redundancy and flexibility.</p>
          <p>🔒 Your API keys are encrypted and stored locally in Obsidian's data directory.</p>
          <p>🌐 Zhipu GLM uses the coding plan endpoint for optimal performance.</p>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPanel;
