import { 
  getBezierPath,
  type EdgeProps,
  BaseEdge
} from '@xyflow/react';
import { useCanvasStore } from '../store';
import './DeletableEdge.css';

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const deleteEdge = useCanvasStore((s) => s.deleteEdge);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, cursor: 'pointer' }} className={`custom-edge ${selected ? 'selected' : ''}`} />
      
      {/* Invisible wide path under the regular stroke for easy hovering */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={30}
        className="react-flow__edge-interaction"
      />
      
      <foreignObject
        width={24}
        height={24}
        x={labelX - 12}
        y={labelY - 12}
        className="edge-button-container"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="edge-delete-btn-wrap">
          <button
            className="edge-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(id);
            }}
            title="Delete connection"
          >
            ×
          </button>
        </div>
      </foreignObject>
    </>
  );
}
