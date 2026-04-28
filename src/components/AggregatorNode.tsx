import { useCallback, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { CopyButton } from './CopyButton';
import { useCanvasStore, type NodeData } from '../store';
import './NodeBase.css';

export function AggregatorNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const handleRun = useCallback(() => {
    // Collect from all inputs
    const incomingEdges = edges.filter((e) => e.target === id);
    let aggregatedText = '';
    
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const d = sourceNode?.data;
      if (!d) continue;

      if (d.output) aggregatedText += (d.output as string).trim() + '\n\n---\n\n';
      else if (d.text) aggregatedText += (d.text as string).trim() + '\n\n---\n\n';
    }

    // Trim trailing divider
    if (aggregatedText.endsWith('\n\n---\n\n')) {
      aggregatedText = aggregatedText.substring(0, aggregatedText.length - 8);
    }

    updateNodeData(id, { output: aggregatedText });
    
    // Auto cascade further down
    const outgoingEdges = edges.filter(e => e.source === id);
    outgoingEdges.forEach(edge => {
      updateNodeData(edge.target, { triggerRun: Date.now() });
    });
  }, [id, edges, nodes, updateNodeData]);

  // Listen for trigger from upstream
  useEffect(() => {
    if (data.triggerRun) {
      handleRun();
      updateNodeData(id, { triggerRun: undefined });
    }
  }, [data.triggerRun, handleRun, id, updateNodeData]);

  const combinedText = data.output as string;

  return (
    <NodeBase
      label={data.label as string}
      accentColor="#ffd036"
      icon="📚"
      onDelete={() => deleteNode(id)}
    >
      <Handle type="target" position={Position.Left} id="in" />

      <div className="gemma-node__body">
        <label className="node-label">Aggregated Results</label>
        <div className={"node-output " + (!combinedText ? 'placeholder' : 'has-content')}>
          <CopyButton text={combinedText} />
          <div className="node-output__content">
            {combinedText || 'Results from upstream branches will aggregate here...'}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} id="out" />
    </NodeBase>
  );
}
