import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import { aiChat, aiVision } from '../ai';
import './NodeBase.css';

export function ExtractorNode({ id, data }: NodeProps<NodeData>) {
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

    const query = (data.extractQuery as string) || 'Extract key information.';

    if (!inputText.trim() && !imageDataUrl) {
      updateNodeData(id, { error: 'Connect a Text Input or Image Input node.' });
      return;
    }

    updateNodeData(id, { running: true, error: undefined, output: '' });

    try {
      if (imageDataUrl) {
        const prompt = `${query}\n\nExtract exactly what is asked, return only the extracted content.`;
        await aiVision(prompt, imageDataUrl, selectedModel, (c) =>
          updateNodeData(id, { output: c })
        );
      } else {
        await aiChat(
          [
            {
              role: 'system',
              content:
                'You are a precise information extractor. Return only what is asked, structured as clearly as possible.',
            },
            { role: 'user', content: `Text:\n${inputText}\n\nTask: ${query}` },
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
      accentColor="var(--accent-orange)"
      icon="🔍"
      running={data.running as boolean}
      error={data.error as string}
      onDelete={() => deleteNode(id)}
      minWidth={300}
    >
      <Handle type="target" position={Position.Left} id="in" />

      <div>
        <div className="node-label">Extract Query</div>
        <textarea
          className="node-textarea"
          rows={2}
          value={(data.extractQuery as string) || ''}
          onChange={(e) => updateNodeData(id, { extractQuery: e.target.value })}
          placeholder="Extract all prices from the document…"
        />
      </div>

      <button
        className="node-run-btn"
        onClick={handleRun}
        disabled={data.running as boolean}
        style={{ '--node-accent': 'var(--accent-orange)' } as React.CSSProperties}
      >
        {data.running ? 'Extracting…' : '🔍 Extract'}
      </button>

      {output && (
        <div>
          <div className="node-label">Extracted</div>
          <div className="node-output has-content">{output}</div>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="output" />
    </NodeBase>
  );
}
