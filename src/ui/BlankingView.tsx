/**
 * Blanking View Component
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { BlankItem, BlankingResult } from '../types/blanking';
import '../styles/blanking.css';

interface BlankingViewProps {
  blanks: BlankItem[];
  imageUrl?: string;
  onAnswerSubmit: (blankId: string, answer: string) => void;
  onComplete: (result: BlankingResult) => void;
}

export const BlankingView: React.FC<BlankingViewProps> = ({
  blanks,
  imageUrl,
  onAnswerSubmit,
  onComplete,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [activeBlankId, setActiveBlankId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  const handleBlankClick = (blankId: string) => {
    setActiveBlankId(blankId);
  };

  const handleAnswerChange = (blankId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [blankId]: value }));
  };

  const handleAnswerSubmit = (blankId: string) => {
    const answer = answers[blankId] || '';
    const blank = blanks.find(b => b.id === blankId);

    if (blank && answer.trim()) {
      // Check answer (simplified - in real implementation would call BlankingService)
      const isCorrect = answer.toLowerCase().includes(blank.keyword.toLowerCase()) ||
                       blank.keyword.toLowerCase().includes(answer.toLowerCase());

      setResults(prev => ({ ...prev, [blankId]: isCorrect }));
      onAnswerSubmit(blankId, answer);
      setActiveBlankId(null);
    }
  };

  const handleShowResults = () => {
    setShowResults(true);

    // Calculate results
    const totalBlanks = blanks.length;
    const correctAnswers = Object.values(results).filter(r => r === true).length;
    const incorrectAnswers = Object.values(results).filter(r => r === false).length;
    const unansweredBlanks = totalBlanks - Object.keys(results).length;
    const accuracy = totalBlanks > 0 ? (correctAnswers / totalBlanks) * 100 : 0;
    const timeSpent = Date.now() - startTimeRef.current;

    onComplete({
      totalBlanks,
      correctAnswers,
      incorrectAnswers,
      unansweredBlanks,
      accuracy,
      timeSpent,
    });
  };

  const handleReset = () => {
    setAnswers({});
    setResults({});
    setActiveBlankId(null);
    setShowResults(false);
    startTimeRef.current = Date.now();
  };

  const correctCount = Object.values(results).filter(r => r === true).length;
  const incorrectCount = Object.values(results).filter(r => r === false).length;
  const unansweredCount = blanks.length - Object.keys(results).length;

  return (
    <div className="blanking-container">
      <div className="blanking-header">
        <h3>Blanking Mode - Fill in the Blanks</h3>
        <div className="blanking-stats">
          <span className="stat correct">✓ {correctCount}</span>
          <span className="stat incorrect">✗ {incorrectCount}</span>
          <span className="stat unanswered">? {unansweredCount}</span>
        </div>
      </div>

      <div className="blanking-content">
        <div className="blanking-image-container" ref={containerRef}>
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Infographic"
              className="blanking-image"
            />
          )}

          {/* Overlay with blanks */}
          <svg className="blanking-overlay" width="100%" height="100%">
            {blanks.map(blank => (
              <g key={blank.id}>
                {/* Blank rectangle */}
                <rect
                  x={`${blank.bounds.x}%`}
                  y={`${blank.bounds.y}%`}
                  width={`${blank.bounds.width}%`}
                  height={`${blank.bounds.height}%`}
                  className={`blank-rect ${
                    results[blank.id] === true
                      ? 'correct'
                      : results[blank.id] === false
                      ? 'incorrect'
                      : activeBlankId === blank.id
                      ? 'active'
                      : 'default'
                  }`}
                  onClick={() => handleBlankClick(blank.id)}
                />

                {/* Blank number */}
                <text
                  x={`${blank.bounds.x + blank.bounds.width / 2}%`}
                  y={`${blank.bounds.y + blank.bounds.height / 2}%`}
                  className="blank-number"
                  onClick={() => handleBlankClick(blank.id)}
                >
                  {blanks.indexOf(blank) + 1}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="blanking-panel">
          <div className="blanking-instructions">
            <p>Click on the highlighted areas to fill in the blanks.</p>
          </div>

          {activeBlankId && (
            <div className="blanking-input-section">
              {(() => {
                const blank = blanks.find(b => b.id === activeBlankId);
                return (
                  <>
                    <div className="blank-question">
                      <strong>Question {blanks.indexOf(blank!) + 1}:</strong>
                      <p>Fill in the blank: <em>_____ {blank?.keyword} _____</em></p>
                    </div>

                    <div className="blank-input-group">
                      <input
                        type="text"
                        placeholder="Type your answer..."
                        value={answers[activeBlankId] || ''}
                        onChange={e => handleAnswerChange(activeBlankId, e.target.value)}
                        onKeyPress={e => {
                          if (e.key === 'Enter') {
                            handleAnswerSubmit(activeBlankId);
                          }
                        }}
                        autoFocus
                        className="blank-input"
                      />
                      <button
                        onClick={() => handleAnswerSubmit(activeBlankId)}
                        className="blank-submit-btn"
                      >
                        Submit
                      </button>
                    </div>

                    {results[activeBlankId] !== undefined && (
                      <div className={`blank-feedback ${results[activeBlankId] ? 'correct' : 'incorrect'}`}>
                        {results[activeBlankId] ? (
                          <>
                            <strong>✓ Correct!</strong>
                            <p>The answer "{answers[activeBlankId]}" is correct.</p>
                          </>
                        ) : (
                          <>
                            <strong>✗ Incorrect</strong>
                            <p>The correct answer is: <strong>{blank?.keyword}</strong></p>
                          </>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {!showResults && (
            <button
              onClick={handleShowResults}
              className="blanking-complete-btn"
              disabled={Object.keys(results).length === 0}
            >
              Show Results
            </button>
          )}

          {showResults && (
            <div className="blanking-results">
              <h4>Results</h4>
              <div className="results-summary">
                <div className="result-item correct">
                  <span className="label">Correct:</span>
                  <span className="value">{correctCount}/{blanks.length}</span>
                </div>
                <div className="result-item incorrect">
                  <span className="label">Incorrect:</span>
                  <span className="value">{incorrectCount}/{blanks.length}</span>
                </div>
                <div className="result-item unanswered">
                  <span className="label">Unanswered:</span>
                  <span className="value">{unansweredCount}/{blanks.length}</span>
                </div>
              </div>

              <div className="accuracy-bar">
                <div
                  className="accuracy-fill"
                  style={{
                    width: `${(correctCount / blanks.length) * 100}%`,
                  }}
                />
                <span className="accuracy-text">
                  {Math.round((correctCount / blanks.length) * 100)}% Accuracy
                </span>
              </div>

              <button onClick={handleReset} className="blanking-reset-btn">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlankingView;
