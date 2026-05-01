import { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store';
import { checkConnection } from '../ai';
import './Toolbar.css';

export function Toolbar() {
  const selectedModel = useCanvasStore((s) => s.selectedModel);
  const setSelectedModel = useCanvasStore((s) => s.setSelectedModel);
  const backend = useCanvasStore((s) => s.backend);
  const setBackend = useCanvasStore((s) => s.setBackend);
  const mimoApiKey = useCanvasStore((s) => s.mimoApiKey);
  const setMimoApiKey = useCanvasStore((s) => s.setMimoApiKey);
  const mimoBaseUrl = useCanvasStore((s) => s.mimoBaseUrl);
  const setMimoBaseUrl = useCanvasStore((s) => s.setMimoBaseUrl);
  const mimoModel = useCanvasStore((s) => s.mimoModel);
  const setMimoModel = useCanvasStore((s) => s.setMimoModel);
  const ollamaStatus = useCanvasStore((s) => s.ollamaStatus);
  const setOllamaStatus = useCanvasStore((s) => s.setOllamaStatus);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const saveWorkflow = useCanvasStore((s) => s.saveWorkflow);
  const loadWorkflow = useCanvasStore((s) => s.loadWorkflow);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(mimoApiKey);

  useEffect(() => {
    const check = async () => {
      setOllamaStatus({ checking: true });
      try {
        const result = await checkConnection();
        setOllamaStatus({ connected: result.connected, models: result.models, checking: false });
      } catch {
        setOllamaStatus({ connected: false, models: [], checking: false });
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [setOllamaStatus, backend, mimoApiKey, mimoBaseUrl]);

  const handleSave = () => {
    const json = saveWorkflow();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemma-workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) loadWorkflow(ev.target.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveApiKey = () => {
    setMimoApiKey(apiKeyInput);
    setShowSettings(false);
  };

  const models = ollamaStatus.models.length > 0
    ? ollamaStatus.models
    : backend === 'mimo'
      ? ['mimo-v2-omni', 'mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-pro']
      : ['gemma4:e4b', 'gemma4:31b'];

  return (
    <header className="toolbar">
      {/* Connection status */}
      <div className="toolbar__status">
        <div className={`status-dot ${ollamaStatus.checking ? 'checking' : ollamaStatus.connected ? 'connected' : 'disconnected'}`} />
        <span className="status-label">
          {ollamaStatus.checking ? 'Connecting…' : ollamaStatus.connected ? (backend === 'mimo' ? 'Mimo API' : 'Ollama') : 'Offline'}
        </span>
      </div>

      <div className="toolbar__divider" />

      {/* Backend selector */}
      <div className="toolbar__model">
        <span className="toolbar__label">Backend</span>
        <select
          className="toolbar__select"
          value={backend}
          onChange={(e) => setBackend(e.target.value as 'ollama' | 'mimo')}
        >
          <option value="ollama">Ollama (Local)</option>
          <option value="mimo">Mimo API (Cloud)</option>
        </select>
      </div>

      <div className="toolbar__divider" />

      {/* Global model selector */}
      <div className="toolbar__model">
        <span className="toolbar__label">Global Model</span>
        <select
          className="toolbar__select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {[...new Set(models)].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Settings button for mimo */}
      {backend === 'mimo' && (
        <>
          <div className="toolbar__divider" />
          <button
            className={`toolbar__btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Mimo API Settings"
          >
            ⚙ API Settings
          </button>
        </>
      )}

      <div className="toolbar__spacer" />

      {/* Actions */}
      <button className="toolbar__btn" onClick={handleSave} title="Save workflow">
        💾 Save
      </button>
      <button className="toolbar__btn" onClick={() => fileInputRef.current?.click()} title="Load workflow">
        📂 Load
      </button>
      <button className="toolbar__btn danger" onClick={() => {
        if (confirm('Clear the entire canvas?')) clearCanvas();
      }} title="Clear canvas">
        🗑 Clear
      </button>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleLoad} />

      {/* Settings panel */}
      {showSettings && (
        <div className="toolbar__settings-panel">
          <div className="toolbar__settings-title">Mimo API Configuration</div>
          <div className="toolbar__settings-row">
            <label>API Key</label>
            <input
              type="password"
              className="toolbar__settings-input"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your mimo API key"
            />
          </div>
          <div className="toolbar__settings-row">
            <label>Base URL</label>
            <input
              type="text"
              className="toolbar__settings-input"
              value={mimoBaseUrl}
              onChange={(e) => setMimoBaseUrl(e.target.value)}
              placeholder="https://token-plan-sgp.xiaomimimo.com/v1"
            />
          </div>
          <div className="toolbar__settings-row">
            <label>Model ID</label>
            <input
              type="text"
              className="toolbar__settings-input"
              value={mimoModel}
              onChange={(e) => setMimoModel(e.target.value)}
              placeholder="mimo-v2-omni"
            />
          </div>
          <div className="toolbar__settings-actions">
            <button className="toolbar__btn" onClick={handleSaveApiKey}>
              💾 Save
            </button>
            <button className="toolbar__btn" onClick={() => setShowSettings(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
