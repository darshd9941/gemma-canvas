import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCanvasStore, type NodeData } from '../store';
import { NodeBase } from './NodeBase';
import './NodeBase.css';

export function StartNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const edges = useCanvasStore((s) => s.edges);

  const handleRun = useCallback(() => {
    // Fire trigger signal to all connected outputs
    const outgoingEdges = edges.filter(e => e.source === id);
    outgoingEdges.forEach(edge => {
      updateNodeData(edge.target, { triggerRun: Date.now() });
    });
  }, [id, edges, updateNodeData]);

  return (
    <NodeBase
      label={data.label as string}
      accentColor="#61e967"
      icon="🚀"
      onDelete={() => deleteNode(id)}
      minWidth={200}
    >
      <div className="gemma-node__body">
        <label className="node-label">Start Global Execution</label>
        <button 
          onClick={handleRun}
          style={{
            background: '#61e967',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '14px',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            textAlign: 'center',
            width: '100%',
            marginTop: '8px',
            boxShadow: '0 4px 14px rgba(97,233,103,0.3)',
            transition: 'all 0.2s'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          ▶ RUN WORKFLOW
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </NodeBase>
  );
}
