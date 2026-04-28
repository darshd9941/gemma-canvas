import { useCallback, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import './NodeBase.css';

export function RouterNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const conditionStr = (data.condition as string) || '';

  const handleRun = useCallback(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    let aggregatedText = '';
    
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const d = sourceNode?.data;
      if (d?.output) aggregatedText += d.output;
      else if (d?.text) aggregatedText += d.text;
    }

    // Basic routing logic: checking if input contains substring
    // In a more advanced build, we could use eval() or precise regex, but simple contains is sturdy.
    const isTrue = aggregatedText.toLowerCase().includes(conditionStr.toLowerCase());

    const resultTxt = isTrue ? 'TRUE \n\nRouting execution to Top output pin.' : 'FALSE \n\nRouting execution to Bottom output pin.';
    updateNodeData(id, { output: resultTxt });
    
    // Auto cascade selectively based on condition
    const targetPort = isTrue ? 'true-out' : 'false-out';
    const outgoingEdges = edges.filter(e => e.source === id && e.sourceHandle === targetPort);
    
    outgoingEdges.forEach(edge => {
      updateNodeData(edge.target, { triggerRun: Date.now() });
    });
  }, [id, edges, nodes, conditionStr, updateNodeData]);

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
      accentColor="#b2bec3"
      icon="🔀"
      onDelete={() => deleteNode(id)}
    >
      <Handle type="target" position={Position.Left} id="in" />

      <div className="gemma-node__body">
        <div>
          <label className="node-label">Condition: Contains Substring</label>
          <input
            className="node-input"
            value={conditionStr}
            onChange={(e) => updateNodeData(id, { condition: e.target.value })}
            placeholder='e.g. "yes" or "positive"'
          />
        </div>

        <div className={"node-output " + (!output ? 'placeholder' : 'has-content')} style={{ minHeight: '40px', paddingRight: '14px' }}>
          <div className="node-output__content">
            {output ? output.split('\n\n').map((l, i) => <div key={i}>{l}</div>) : 'Awaiting input check...'}
          </div>
        </div>
      </div>
      
      {/* Dual output handles */}
      <div style={{ position: 'absolute', right: -6, top: '55%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', right: '15px', top: '-6px', fontSize: '10px', color: '#61e967', fontWeight: 'bold' }}>TRUE</span>
          <Handle type="source" position={Position.Right} id="true-out" style={{ position: 'relative', top: 0, right: 0, transform: 'none', background: '#61e967', borderColor: '#61e967' }} />
        </div>
        <div style={{ position: 'relative' }}>
           <span style={{ position: 'absolute', right: '15px', top: '-6px', fontSize: '10px', color: '#ff4757', fontWeight: 'bold' }}>FALSE</span>
          <Handle type="source" position={Position.Right} id="false-out" style={{ position: 'relative', top: 0, right: 0, transform: 'none', background: '#ff4757', borderColor: '#ff4757' }} />
        </div>
      </div>
    </NodeBase>
  );
}
