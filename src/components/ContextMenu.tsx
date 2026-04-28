import { useEffect } from 'react';
import type { NodeType } from '../store';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onSelect: (type: NodeType) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, onSelect, onClose }: ContextMenuProps) {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Check if click was outside this menu
      const el = document.getElementById('canvas-context-menu');
      if (el && !el.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [onClose]);

  const items: { label: string; type: NodeType; icon: string }[] = [
    { label: 'Assistant', type: 'assistant', icon: '🗯️' },
    { label: 'Gemma Chat', type: 'gemmaChat', icon: '🤖' },
    { label: 'Prompt Enhancer', type: 'promptEnhancer', icon: '✨' },
    { label: 'Describe Image', type: 'describeImage', icon: '👁️' },
    { label: 'Extractor', type: 'extractor', icon: '🔍' },
    { label: 'Classifier', type: 'classifier', icon: '🏷️' },
    { label: 'Text Input', type: 'textInput', icon: '📝' },
    { label: 'Image Input', type: 'imageInput', icon: '🖼️' },
    { label: 'Text Output', type: 'textViewer', icon: '📄' },
    { label: 'Note', type: 'notepad', icon: '📋' },
    { label: 'Global Start', type: 'startTrigger', icon: '🚀' },
    { label: 'Aggregator', type: 'aggregator', icon: '📚' },
    { label: 'Math Ops', type: 'math', icon: '🔢' },
    { label: 'Router (IF)', type: 'router', icon: '🔀' },
    { label: 'Loop', type: 'loop', icon: '🔁' },
  ];

  // Keep menu within bounds roughly
  const styles: React.CSSProperties = {
    top: Math.min(y, window.innerHeight - 300),
    left: Math.min(x, window.innerWidth - 200),
  };

  return (
    <div id="canvas-context-menu" className="canvas-context-menu" style={styles}>
      <div className="canvas-context-menu__title">Add Node</div>
      <div className="canvas-context-menu__list">
        {items.map((item) => (
          <button
            key={item.type}
            className="canvas-context-menu__item"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.type);
            }}
          >
            <span className="canvas-context-menu__icon">{item.icon}</span>
            <span className="canvas-context-menu__label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
