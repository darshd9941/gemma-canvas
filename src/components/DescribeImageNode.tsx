import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import { aiVision } from '../ai';
import './NodeBase.css';

export function DescribeImageNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const selectedModel = useCanvasStore((s) => s.selectedModel);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const handleRun = useCallback(async () => {
    // Find connected image from upstream ImageInputNode
    const incomingEdges = edges.filter((e) => e.target === id);
    let imageDataUrl: string | undefined;
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode?.data?.imageDataUrl) {
        imageDataUrl = sourceNode.data.imageDataUrl as string;
        break;
      }
    }

    if (!imageDataUrl) {
      updateNodeData(id, { error: 'No image connected. Connect an Image Input node.' });
      return;
    }

    updateNodeData(id, { running: true, error: undefined, output: '' });

    try {
      const prompt = (data.userPrompt as string) || 'Describe this image in detail.';
      const result = await aiVision(prompt, imageDataUrl, selectedModel, (chunk) => {
        updateNodeData(id, { output: chunk });
      });
      updateNodeData(id, { output: result });
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
      accentColor="var(--accent-cyan)"
      icon="👁️"
      running={data.running as boolean}
      error={data.error as string}
      onDelete={() => deleteNode(id)}
      minWidth={300}
    >
      <Handle type="target" position={Position.Left} id="image-in" />

      <div>
        <div className="node-label">Instruction</div>
        <textarea
          className="node-textarea"
          rows={2}
          value={(data.userPrompt as string) || ''}
          onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
          placeholder="Describe this image in detail."
        />
      </div>

      <button
        className="node-run-btn"
        onClick={handleRun}
        disabled={data.running as boolean}
        style={{ '--node-accent': 'var(--accent-cyan)' } as React.CSSProperties}
      >
        {data.running ? 'Analyzing…' : '▶ Describe'}
      </button>

      {output && (
        <div>
          <div className="node-label">Description</div>
          <div className="node-output has-content">{output}</div>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="output" />
    </NodeBase>
  );
}
