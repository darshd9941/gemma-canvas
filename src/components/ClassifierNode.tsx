import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import { aiChat, aiVision } from '../ai';
import './NodeBase.css';

export function ClassifierNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const selectedModel = useCanvasStore((s) => s.selectedModel);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const handleRun = useCallback(async () => {
    const incomingEdges = edges.filter((e) => e.target === id);
    let inputText = '';
    let imageDataUrl: string | undefined;

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const d = sourceNode?.data;
      if (d?.imageDataUrl) imageDataUrl = d.imageDataUrl as string;
      if (d?.text) inputText += d.text as string + '\n';
      if (d?.output) inputText += d.output as string + '\n';
    }

    const options = (data.classifyOptions as string) || 'positive, negative, neutral';

    if (!inputText.trim() && !imageDataUrl) {
      updateNodeData(id, { error: 'Connect a Text Input or Image Input node.' });
      return;
    }

    updateNodeData(id, { running: true, error: undefined, output: '' });

    const systemPrompt = `You are a precise classifier. Given the input, classify it into exactly one of the following categories: ${options}. 
Return ONLY the category name, no explanation.`;

    try {
      if (imageDataUrl) {
        await aiVision(
          `Classify this image into one of these categories: ${options}. Return only the category name.`,
          imageDataUrl,
          selectedModel,
          (c) => updateNodeData(id, { output: c })
        );
      } else {
        await aiChat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: inputText.trim() },
          ],
          selectedModel,
          (c) => updateNodeData(id, { output: c })
        );
      }
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
      accentColor="var(--accent-green)"
      icon="🏷️"
      running={data.running as boolean}
      error={data.error as string}
      onDelete={() => deleteNode(id)}
      minWidth={280}
    >
      <Handle type="target" position={Position.Left} id="in" />

      <div>
        <div className="node-label">Categories (comma-separated)</div>
        <input
          className="node-input"
          value={(data.classifyOptions as string) || ''}
          onChange={(e) => updateNodeData(id, { classifyOptions: e.target.value })}
          placeholder="positive, negative, neutral"
        />
      </div>

      <button
        className="node-run-btn"
        onClick={handleRun}
        disabled={data.running as boolean}
        style={{ '--node-accent': 'var(--accent-green)' } as React.CSSProperties}
      >
        {data.running ? 'Classifying…' : '🏷️ Classify'}
      </button>

      {output && (
        <div>
          <div className="node-label">Result</div>
          <div
            className="node-output has-content"
            style={{ fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '14px' }}
          >
            {output.trim()}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="output" />
    </NodeBase>
  );
}
