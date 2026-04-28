import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import { ollamaChat } from '../ollama';
import './NodeBase.css';

export function GemmaChatNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const selectedModel = useCanvasStore((s) => s.selectedModel);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const model = (data.model as string) || selectedModel;

  // Resolve connected input text from upstream nodes
  const getConnectedText = useCallback(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    let injected = '';
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;
      const d = sourceNode.data;
      if (d.text) injected += d.text + '\n';
      if (d.output) injected += d.output + '\n';
    }
    return injected.trim();
  }, [edges, id, nodes]);

  const handleRun = useCallback(async () => {
    updateNodeData(id, { running: true, error: undefined, output: '' });
    try {
      const injected = getConnectedText();
      const userContent = [
        injected ? `Context:\n${injected}` : '',
        data.userPrompt as string || '',
      ].filter(Boolean).join('\n\n');

      const messages = [
        { role: 'system' as const, content: (data.systemPrompt as string) || 'You are a helpful assistant.' },
        { role: 'user' as const, content: userContent },
      ];

      await ollamaChat(messages, model, (chunk) => {
        updateNodeData(id, { output: chunk });
      });
    } catch (e: unknown) {
      updateNodeData(id, { error: (e as Error).message });
    } finally {
      updateNodeData(id, { running: false });
    }
  }, [id, data, model, getConnectedText, updateNodeData]);

  const output = data.output as string;

  return (
    <NodeBase
      label={data.label as string}
      accentColor="var(--accent-purple)"
      icon="🤖"
      running={data.running as boolean}
      error={data.error as string}
      onDelete={() => deleteNode(id)}
      minWidth={320}
    >
      <Handle type="target" position={Position.Left} id="text-in" />

      <div>
        <div className="node-label">Model</div>
        <ModelSelect id={id} currentModel={model} />
      </div>

      <div>
        <div className="node-label">System Prompt</div>
        <textarea
          className="node-textarea"
          rows={2}
          value={(data.systemPrompt as string) || ''}
          onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant."
        />
      </div>

      <div>
        <div className="node-label">User Message</div>
        <textarea
          className="node-textarea"
          rows={3}
          value={(data.userPrompt as string) || ''}
          onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
          placeholder="Ask anything…"
        />
      </div>

      <button
        className="node-run-btn"
        onClick={handleRun}
        disabled={data.running as boolean}
        style={{ '--node-accent': 'var(--accent-purple)' } as React.CSSProperties}
      >
        {data.running ? 'Running…' : '▶ Run'}
      </button>

      {output && (
        <div>
          <div className="node-label">Output</div>
          <div className={`node-output has-content`}>{output}</div>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="output" />
    </NodeBase>
  );
}

function ModelSelect({ id, currentModel }: { id: string; currentModel: string }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const models = useCanvasStore((s) => s.ollamaStatus.models);
  const fallback = useCanvasStore((s) => s.selectedModel);
  const allModels = models.length > 0 ? models : [fallback, 'gemma4:e4b', 'gemma4:31b'];
  const unique = [...new Set(allModels)];

  return (
    <select
      className="node-select"
      value={currentModel}
      onChange={(e) => updateNodeData(id, { model: e.target.value })}
    >
      {unique.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}
