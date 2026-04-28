import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import './NodeBase.css';

export function NotepadNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  return (
    <NodeBase
      label={data.label as string}
      accentColor="#f5c542"
      icon="📝"
      onDelete={() => deleteNode(id)}
      minWidth={240}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <textarea
        className="node-textarea"
        rows={6}
        value={(data.text as string) || ''}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Add a note, label, or comment…"
        style={{ resize: 'both', background: 'rgba(245,197,66,0.04)', borderColor: 'rgba(245,197,66,0.2)' }}
      />
    </NodeBase>
  );
}
