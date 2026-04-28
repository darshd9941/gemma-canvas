import { useCallback, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { CopyButton } from './CopyButton';
import { useCanvasStore, type NodeData } from '../store';
import './NodeBase.css';

export function MathNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const operator = (data.operator as string) || '+';

  const handleRun = useCallback(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    let aggregatedText = '';
    
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const d = sourceNode?.data;
      if (d?.output) aggregatedText += d.output + ' ';
      else if (d?.text) aggregatedText += d.text + ' ';
    }

    // Extract all numbers
    const matches = aggregatedText.match(/[+-]?\d+(\.\d+)?/g);
    let resultText = '';

    if (!matches || matches.length === 0) {
      resultText = 'Error: No numbers found in input.';
    } else {
      const numbers = matches.map(Number);
      let result = numbers[0];
      for (let i = 1; i < numbers.length; i++) {
        switch (operator) {
          case '+': result += numbers[i]; break;
          case '-': result -= numbers[i]; break;
          case '*': result *= numbers[i]; break;
          case '/': result = numbers[i] !== 0 ? result / numbers[i] : NaN; break;
        }
      }
      resultText = isNaN(result) ? 'Error: Div by zero or NaN' : result.toString();
    }

    updateNodeData(id, { output: resultText });
    
    // Auto cascade further down
    const outgoingEdges = edges.filter(e => e.source === id);
    outgoingEdges.forEach(edge => {
      updateNodeData(edge.target, { triggerRun: Date.now() });
    });
  }, [id, edges, nodes, operator, updateNodeData]);

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
      accentColor="#ff4757"
      icon="🔢"
      onDelete={() => deleteNode(id)}
    >
      <Handle type="target" position={Position.Left} id="in" />

      <div className="gemma-node__body">
        <div>
          <label className="node-label">Operator</label>
          <select 
            className="node-select" 
            value={operator}
            onChange={e => updateNodeData(id, { operator: e.target.value })}
            style={{ marginBottom: '10px' }}
          >
            <option value="+">Addition (+)</option>
            <option value="-">Subtraction (-)</option>
            <option value="*">Multiplication (*)</option>
            <option value="/">Division (/)</option>
          </select>
        </div>

        <label className="node-label">Result</label>
        <div className={"node-output " + (!combinedText ? 'placeholder' : 'has-content')} style={{ minHeight: '40px' }}>
          <CopyButton text={combinedText} />
          <div className="node-output__content">
            {combinedText || 'Awaiting inputs...'}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} id="out" />
    </NodeBase>
  );
}
