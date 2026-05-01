import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import { aiChat } from '../ai';
import './NodeBase.css';

const ENHANCE_SYSTEM = `You are a creative AI prompt engineering expert. 
When given a short prompt or idea, expand it into a vivid, detailed, and rich prompt. 
Preserve the user's intent while adding descriptive detail, style cues, lighting, atmosphere, and composition.
Return ONLY the enhanced prompt, no explanations.`;

export function PromptEnhancerNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const selectedModel = useCanvasStore((s) => s.selectedModel);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const handleRun = useCallback(async () => {
    // Resolve upstream text
    const incomingEdges = edges.filter((e) => e.target === id);
    let inputText = (data.userPrompt as string) || '';
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const d = sourceNode?.data;
      if (d?.text) inputText = d.text as string;
      else if (d?.output) inputText = d.output as string;
    }

    if (!inputText.trim()) {
      updateNodeData(id, { error: 'No input text. Connect a Text Input or type a prompt.' });
      return;
    }

    updateNodeData(id, { running: true, error: undefined, output: '' });

    try {
      await aiChat(
        [
          { role: 'system', content: ENHANCE_SYSTEM },
          { role: 'user', content: inputText },
        ],
        selectedModel,
        (chunk) => updateNodeData(id, { output: chunk })
      );
    } catch (e: unknown) {
      updateNodeData(id, { error: (e as Error).message });
    } finally {
      updateNodeData(id, { running: false });
    }
  }, [id, data, edges, nodes, selectedModel, updateNodeData]);

  const output = data.output as string;

  return (
    <NodeBase
      label={data.label as string}
      accentColor="var(--accent-pink)"
      icon="✨"
      running={data.running as boolean}
      error={data.error as string}
      onDelete={() => deleteNode(id)}
      minWidth={300}
    >
      <Handle type="target" position={Position.Left} id="text-in" />

      <div>
        <div className="node-label">Short Prompt</div>
        <textarea
          className="node-textarea"
          rows={2}
          value={(data.userPrompt as string) || ''}
          onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
          placeholder="a cat sitting on a cyberpunk rooftop…"
        />
      </div>

      <button
        className="node-run-btn"
        onClick={handleRun}
        disabled={data.running as boolean}
        style={{ '--node-accent': 'var(--accent-pink)' } as React.CSSProperties}
      >
        {data.running ? 'Enhancing…' : '✨ Enhance'}
      </button>

      {output && (
        <div>
          <div className="node-label">Enhanced Prompt</div>
          <div className="node-output has-content">{output}</div>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="output" />
    </NodeBase>
  );
}
