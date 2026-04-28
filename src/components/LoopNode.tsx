import { useCallback, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import './NodeBase.css';

export function LoopNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const edges = useCanvasStore((s) => s.edges);

  const maxLoops = (data.maxLoops as number) || 1;
  const currentLoop = (data.currentLoop as number) || 0;

  const handleRun = useCallback(() => {
    let nextLoop = currentLoop + 1;
    let targetPort = 'loop-out';

    if (nextLoop >= maxLoops) {
      targetPort = 'done-out';
      nextLoop = 0; // Reset for next global run
      updateNodeData(id, { output: `Loop Finished (${maxLoops}/${maxLoops})` });
    } else {
      updateNodeData(id, { output: `Looping (${nextLoop}/${maxLoops})` });
    }

    updateNodeData(id, { currentLoop: nextLoop });
    
    // Cascade specifically out the correct port
    const outgoingEdges = edges.filter(e => e.source === id && e.sourceHandle === targetPort);
    outgoingEdges.forEach(edge => {
      updateNodeData(edge.target, { triggerRun: Date.now() });
    });
  }, [id, maxLoops, currentLoop, edges, updateNodeData]);

  useEffect(() => {
    if (data.triggerRun) {
      handleRun();
      updateNodeData(id, { triggerRun: undefined });
    }
  }, [data.triggerRun, handleRun, id, updateNodeData]);

  const output = data.output as string;

  return (
    <NodeBase
      label={data.label as string}
      accentColor="#8e44ad"
      icon="🔁"
      onDelete={() => deleteNode(id)}
      minWidth={220}
    >
      <Handle type="target" position={Position.Left} id="in" />

      <div className="gemma-node__body">
        <div>
          <label className="node-label">Execution Count / Max Loops</label>
          <input
            className="node-input"
            type="number"
            min={1}
            max={100}
            value={maxLoops}
            onChange={(e) => updateNodeData(id, { maxLoops: parseInt(e.target.value) || 1 })}
          />
        </div>

        <div className={"node-output " + (!output ? 'placeholder' : 'has-content')} style={{ minHeight: '30px', paddingRight: '14px', textAlign: 'center', fontWeight: 'bold' }}>
          {output || 'Ready to Loop'}
        </div>
        <button 
           onClick={() => updateNodeData(id, { currentLoop: 0, output: 'Reset' })}
           style={{ background: 'transparent', border: '1px solid var(--border-bright)', color: 'var(--text-muted)', borderRadius: '4px', cursor: 'pointer', padding: '4px', fontSize: '10px', marginTop: '6px' }}
        >
          Reset Counter
        </button>
      </div>
      
      {/* Dual output handles */}
      <div style={{ position: 'absolute', right: -6, top: '55%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', right: '15px', top: '-6px', fontSize: '10px', color: '#ffb8b8', fontWeight: 'bold' }}>LOOP</span>
          <Handle type="source" position={Position.Right} id="loop-out" style={{ position: 'relative', top: 0, right: 0, transform: 'none', background: '#ffb8b8', borderColor: '#ffb8b8' }} />
        </div>
        <div style={{ position: 'relative' }}>
           <span style={{ position: 'absolute', right: '15px', top: '-6px', fontSize: '10px', color: '#61e967', fontWeight: 'bold' }}>DONE</span>
          <Handle type="source" position={Position.Right} id="done-out" style={{ position: 'relative', top: 0, right: 0, transform: 'none', background: '#61e967', borderColor: '#61e967' }} />
        </div>
      </div>
    </NodeBase>
  );
}
