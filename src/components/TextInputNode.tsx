import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import './NodeBase.css';

export function TextInputNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  return (
    <NodeBase
      label={data.label as string}
      accentColor="var(--accent-blue)"
      icon="✏️"
      onDelete={() => deleteNode(id)}
    >
      <div>
        <div className="node-label">Text Content</div>
        <textarea
          className="node-textarea"
          rows={4}
          placeholder="Type or paste text here…"
          value={data.text as string || ''}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </NodeBase>
  );
}
