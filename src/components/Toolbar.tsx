import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../store';
import { checkOllamaConnection } from '../ollama';
import './Toolbar.css';

export function Toolbar() {
  const selectedModel = useCanvasStore((s) => s.selectedModel);
  const setSelectedModel = useCanvasStore((s) => s.setSelectedModel);
  const ollamaStatus = useCanvasStore((s) => s.ollamaStatus);
  const setOllamaStatus = useCanvasStore((s) => s.setOllamaStatus);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const saveWorkflow = useCanvasStore((s) => s.saveWorkflow);
  const loadWorkflow = useCanvasStore((s) => s.loadWorkflow);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = async () => {
      setOllamaStatus({ checking: true });
      try {
        const models = await checkOllamaConnection();
        setOllamaStatus({ connected: true, models, checking: false });
      } catch {
        setOllamaStatus({ connected: false, models: [], checking: false });
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [setOllamaStatus]);

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

  const models = ollamaStatus.models.length > 0
    ? ollamaStatus.models
    : ['gemma4:e4b', 'gemma4:31b'];

  return (
    <header className="toolbar">
      {/* Connection status */}
      <div className="toolbar__status">
        <div className={`status-dot ${ollamaStatus.checking ? 'checking' : ollamaStatus.connected ? 'connected' : 'disconnected'}`} />
        <span className="status-label">
          {ollamaStatus.checking ? 'Connecting…' : ollamaStatus.connected ? 'Ollama' : 'Offline'}
        </span>
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
    </header>
  );
}
