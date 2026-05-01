import { useCallback, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCanvasStore, type NodeData } from '../store';
import { aiChat, aiVision } from '../ai';
import { CopyButton } from './CopyButton';
import './AssistantNode.css';

export function AssistantNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const selectedModel = useCanvasStore((s) => s.selectedModel);
  const models = useCanvasStore((s) => s.ollamaStatus.models);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  const [showSettings, setShowSettings] = useState(false);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const model = (data.model as string) || selectedModel;

  const handleRun = useCallback(async (cascade: boolean = false) => {
    const incomingEdges = edges.filter((e) => e.target === id);
    let incomingText = '';
    const incomingImages: string[] = [];

    // Check if any upstream source is still running — if so, wait
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const d = sourceNode?.data;
      if (!d) continue;

      // If upstream is still running, don't process yet — re-trigger will come when it finishes
      if (d.running) return;

      if (edge.targetHandle === 'image-in' && d.imageDataUrl) {
        incomingImages.push(d.imageDataUrl as string);
      } else if (edge.targetHandle === 'text-in') {
        if (d.text) incomingText += (d.text as string) + '\n\n';
        if (d.output) incomingText += (d.output as string) + '\n\n';
      }
    }

    const manualInput = (data.text as string) || '';
    const fullTextPrompt = [incomingText.trim(), manualInput.trim()].filter(Boolean).join('\n\n---\n\n');

    // Check if we have an image-in connection but no image uploaded yet — wait
    const hasImageInEdge = incomingEdges.some((e) => e.targetHandle === 'image-in');
    if (hasImageInEdge && incomingImages.length === 0) {
      // Don't error — just silently wait. The imageInput node will re-trigger us when ready.
      return;
    }

    if (!fullTextPrompt && incomingImages.length === 0) {
      updateNodeData(id, { error: 'Please enter a prompt or connect an input node.' });
      return;
    }

    updateNodeData(id, { running: true, error: undefined, output: '' });
    setMode('view');

    try {
      const sysPrompt = (data.systemPrompt as string) || 'You are a helpful AI assistant.';

      if (incomingImages.length > 0) {
        const visionPrompt = [
          "INSTRUCTION:",
          sysPrompt,
          "\nUSER INPUT / CONTEXT:",
          fullTextPrompt || 'Please analyze this image based on the instructions above.'
        ].join('\n');

        // Retry wrapper for transient network errors
        const runVision = async (attempt: number = 0): Promise<string> => {
          try {
            return await aiVision(visionPrompt, incomingImages[0], model, (chunk) => {
              updateNodeData(id, { output: chunk });
            }, sysPrompt);
          } catch (e: unknown) {
            const msg = (e as Error).message || '';
            if (attempt < 2 && (msg.includes('Failed to fetch') || msg.includes('fetch') || msg.includes('network'))) {
              await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
              return runVision(attempt + 1);
            }
            // Add helpful context to the error
            if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
              throw new Error('Connection failed. Check your API key in ⚙ API Settings and make sure you have internet.');
            }
            throw e;
          }
        };
        await runVision();
      } else {
        const runChat = async (attempt: number = 0): Promise<string> => {
          try {
            return await aiChat(
              [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: fullTextPrompt || 'Please continue based on your system instructions.' }
              ],
              model,
              (chunk) => updateNodeData(id, { output: chunk })
            );
          } catch (e: unknown) {
            const msg = (e as Error).message || '';
            if (attempt < 2 && (msg.includes('Failed to fetch') || msg.includes('fetch') || msg.includes('network'))) {
              await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
              return runChat(attempt + 1);
            }
            if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
              throw new Error('Connection failed. Check your API key in ⚙ API Settings and make sure you have internet.');
            }
            throw e;
          }
        };
        await runChat();
      }
    } catch (e: unknown) {
      updateNodeData(id, { error: (e as Error).message });
    } finally {
      updateNodeData(id, { running: false });
      
      // Cascade execution downstream if requested
      if (cascade) {
        const outgoingEdges = edges.filter(e => e.source === id);
        outgoingEdges.forEach(edge => {
          updateNodeData(edge.target, { triggerRun: Date.now() });
        });
      }
    }
  }, [id, data, edges, nodes, model, updateNodeData]);

  // Listen for external trigger
  useEffect(() => {
    if (data.triggerRun) {
      handleRun({ cascade: true } as any); // Type hacking for useCallback arg
      // Clear trigger so it doesn't loop on mount
      updateNodeData(id, { triggerRun: undefined });
    }
  }, [data.triggerRun, handleRun, id, updateNodeData]);

  const output = data.output as string;
  const running = data.running as boolean;
  const error = data.error as string;

  const allModels = models.length > 0 ? models : [selectedModel, 'gemma4:e4b', 'gemma4:31b'];
  const uniqueModels = [...new Set(allModels)];

  return (
    <div className="assistant-node">
      {/* Dual Target handles sticking out */}
      <div className="assistant-node__in-handles">
        <div className="assistant-handle-box" title="Connect Image Nodes">
          <div className="assistant-handle-icon">🖼️</div>
          <Handle type="target" position={Position.Left} id="image-in" style={{ opacity: 0, width: '100%', height: '100%', left: 0, top: 0, position: 'absolute' }} />
        </div>
        <div className="assistant-handle-box" title="Connect Text Nodes">
          <div className="assistant-handle-icon">📝</div>
          <Handle type="target" position={Position.Left} id="text-in" style={{ opacity: 0, width: '100%', height: '100%', left: 0, top: 0, position: 'absolute' }} />
        </div>
      </div>

      <div className="assistant-node__header">
        <div className="assistant-node__title-row">
          <span className="assistant-node__icon">✏️</span>
          <span className="assistant-node__title">{data.label as string}</span>
        </div>
        <button className="assistant-node__delete" onClick={() => deleteNode(id)}>×</button>
      </div>

      {error && (
        <div className="assistant-node__error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="assistant-node__body">
        <div className="assistant-node__tabs">
          <button className={`assistant-node__tab ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')}>
            <span style={{ fontSize: 13 }}>💬</span> Input
          </button>
          <button className={`assistant-node__tab ${mode === 'view' ? 'active' : ''}`} onClick={() => setMode('view')}>
            <span style={{ fontSize: 13 }}>✨</span> Output
          </button>
        </div>
        
        {showSettings && (
          <div className="assistant-node__settings-panel">
            <label>System Instruction (Persona)</label>
            <textarea 
               placeholder="e.g. You are a pirate..."
               value={(data.systemPrompt as string) || ''}
               onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            />
          </div>
        )}

        <div className="assistant-node__content">
          {mode === 'edit' ? (
            <textarea
              className="assistant-node__textarea"
              placeholder="Ask the assistant anything, or combine with connected inputs..."
              value={(data.text as string) || ''}
              onChange={(e) => updateNodeData(id, { text: e.target.value })}
            />
          ) : (
             <div className="assistant-node__output">
                <CopyButton text={output} />
                <div className="node-output__content">
                  {output ? output : <span style={{ color: 'var(--text-muted)' }}>{running ? 'Waiting for response...' : 'Run the node to see output.'}</span>}
                </div>
             </div>
          )}
        </div>
      </div>

      <div className="assistant-node__footer">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            className="assistant-node__model-select"
            value={model}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
          >
            {uniqueModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button 
            className={`assistant-node__settings-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="System Instructions"
          >
            ⚙️
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button 
            className={`assistant-node__play-btn ${running ? 'running' : ''}`} 
            onClick={() => setShowRunMenu(!showRunMenu)}
            disabled={running}
            title={running ? 'Running...' : 'Run options'}
          >
            {running ? <div className="assistant-spinner" /> : '▶'}
          </button>
          
          {showRunMenu && !running && (
            <div className="assistant-node__run-menu">
              <button onClick={() => { handleRun(false); setShowRunMenu(false); }}>▶ Run this node only</button>
              <button onClick={() => { handleRun(true); setShowRunMenu(false); }}>⏭ Run from here</button>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="out" className="assistant-out-handle" />
    </div>
  );
}
