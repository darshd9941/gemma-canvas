import React from 'react';
import './NodeBase.css';

interface NodeBaseProps {
  label: string;
  accentColor?: string;
  icon: React.ReactNode;
  running?: boolean;
  error?: string;
  onDelete: () => void;
  children: React.ReactNode;
  minWidth?: number;
}

export function NodeBase({
  label,
  accentColor = 'var(--accent-purple)',
  icon,
  running,
  error,
  onDelete,
  children,
  minWidth = 300,
}: NodeBaseProps) {
  return (
    <div
      className="gemma-node"
      style={{ '--node-accent': accentColor, minWidth } as React.CSSProperties}
    >
      <div className="gemma-node__header">
        <div className="gemma-node__icon" style={{ background: `${accentColor}22`, color: accentColor }}>
          {icon}
        </div>
        <span className="gemma-node__title">{label}</span>
        <div className="gemma-node__header-actions">
          {running && <div className="gemma-node__spinner" />}
          <button className="gemma-node__delete" onClick={onDelete} title="Delete node">
            ×
          </button>
        </div>
      </div>

      {error && (
        <div className="gemma-node__error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="gemma-node__body">{children}</div>
    </div>
  );
}
