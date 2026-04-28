import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import { CopyButton } from './CopyButton';
import './NodeBase.css';

// A pure display node — shows whatever is connected to its input
export function TextViewerNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  // Resolve content from upstream
  const incomingEdges = edges.filter((e) => e.target === id);
  let resolvedContent = (data.output as string) || '';
  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const d = sourceNode?.data;
    if (d?.output) resolvedContent = d.output as string;
    else if (d?.text) resolvedContent = d.text as string;
  }

  return (
    <NodeBase
      label={data.label as string}
      accentColor="var(--accent-blue)"
      icon="📄"
      onDelete={() => deleteNode(id)}
      minWidth={300}
    >
      <Handle type="target" position={Position.Left} id="in" />

      <div className="node-label">Output</div>
      <div
        className={`node-output ${resolvedContent ? 'has-content' : 'placeholder'}`}
        style={{ maxHeight: 300, minHeight: 80 }}
      >
        <CopyButton text={resolvedContent} />
        <div className="node-output__content">
          {resolvedContent || 'Connect a node and run it to see output here…'}
        </div>
      </div>

      <div>
        <div className="node-label">Label</div>
        <input
          className="node-input"
          value={(data.label as string) || ''}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Text Output"
        />
      </div>
    </NodeBase>
  );
}
