import { useRef, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeBase } from './NodeBase';
import { useCanvasStore, type NodeData } from '../store';
import './NodeBase.css';
import './ImageInput.css';

export function ImageInputNode({ id, data }: NodeProps<NodeData>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateNodeData(id, { imageDataUrl: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const imageUrl = data.imageDataUrl as string | undefined;

  return (
    <NodeBase
      label={data.label as string}
      accentColor="var(--accent-cyan)"
      icon="🖼️"
      onDelete={() => deleteNode(id)}
      minWidth={280}
    >
      <div
        className="img-drop-zone"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !imageUrl && inputRef.current?.click()}
        style={{ cursor: imageUrl ? 'default' : 'pointer' }}
      >
        {imageUrl ? (
          <div className="img-preview-wrap">
            <img src={imageUrl} alt="Input" className="img-preview" />
            <button
              className="img-clear-btn"
              onClick={(e) => { e.stopPropagation(); updateNodeData(id, { imageDataUrl: undefined }); }}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="img-placeholder">
            <span style={{ fontSize: 24 }}>🖼️</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Drop image or click</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <Handle type="source" position={Position.Right} id="out" />
    </NodeBase>
  );
}
