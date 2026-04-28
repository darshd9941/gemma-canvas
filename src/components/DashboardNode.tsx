import { useCallback, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCanvasStore, type NodeData } from '../store';
import './DashboardNode.css';

export function DashboardNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const [isMaximized, setIsMaximized] = useState(false);

  const handleRun = useCallback(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    let htmlContent = '';
    let imageDataUrl: string | undefined;

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const d = sourceNode?.data;
      if (!d) continue;

      if (edge.targetHandle === 'image-in' && d.imageDataUrl) {
        imageDataUrl = d.imageDataUrl as string;
      } else if (edge.targetHandle === 'text-in') {
        const text = (d.output as string) || (d.text as string) || '';
        htmlContent += text;
      }
    }

    // Clean markdown if the AI wrapped it in ```html
    const cleanedHtml = htmlContent
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    updateNodeData(id, { output: cleanedHtml, imageDataUrl });
    
    // Cascade
    const outgoingEdges = edges.filter(e => e.source === id);
    outgoingEdges.forEach(edge => {
      updateNodeData(edge.target, { triggerRun: Date.now() });
    });
  }, [id, edges, nodes, updateNodeData]);

  useEffect(() => {
    if (data.triggerRun) {
      handleRun();
      updateNodeData(id, { triggerRun: undefined });
    }
  }, [data.triggerRun, handleRun, id, updateNodeData]);

  const html = data.output as string;
  const image = data.imageDataUrl as string;

  return (
    <div className={`dashboard-node ${isMaximized ? 'is-maximized' : ''}`}>
      <Handle type="target" position={Position.Left} id="image-in" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="text-in" style={{ top: '70%' }} />

      <div className="dashboard-node__header">
        <div className="dashboard-node__title">
          <span>📊</span>
          {data.label as string}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="dashboard-node__expand" onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? 'Collapse' : 'Expand'}
          </button>
          <button className="dashboard-node__delete" onClick={() => deleteNode(id)}>×</button>
        </div>
      </div>

      <div className="dashboard-node__body">
        {!html && !image ? (
          <div className="dashboard-node__placeholder">
            <span>📉</span>
            <p>Connect HTML data and Image to see dashboard</p>
          </div>
        ) : (
          <div className="dashboard-html-container">
            {image && (
               <div style={{ textAlign: 'center' }}>
                 <img src={image} alt="Original Ad" className="dashboard-node__image-preview" />
               </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
