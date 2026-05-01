import { useCanvasStore, type NodeType } from '../store';
import './Sidebar.css';

interface NodeCardDef {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  accent: string;
}

const NODE_CATALOG: NodeCardDef[] = [
  {
    type: 'textInput',
    label: 'Text Input',
    description: 'Provide raw text to the workflow',
    icon: '✏️',
    accent: 'var(--accent-blue)',
  },
  {
    type: 'imageInput',
    label: 'Image Input',
    description: 'Upload an image for vision tasks',
    icon: '🖼️',
    accent: 'var(--accent-cyan)',
  },
  {
    type: 'assistant',
    label: 'Assistant',
    description: 'General purpose LLM assistant',
    icon: '🗯️',
    accent: '#ffffff',
  },
  {
    type: 'gemmaChat',
    label: 'Gemma Chat',
    description: 'Full chat with system + user prompt',
    icon: '🤖',
    accent: 'var(--accent-purple)',
  },
  {
    type: 'describeImage',
    label: 'Describe Image',
    description: 'Gemma Vision: describe an image',
    icon: '👁️',
    accent: 'var(--accent-cyan)',
  },
  {
    type: 'promptEnhancer',
    label: 'Prompt Enhancer',
    description: 'Expand short prompts into rich ones',
    icon: '✨',
    accent: 'var(--accent-pink)',
  },
  {
    type: 'extractor',
    label: 'Extractor',
    description: 'Pull specific info from text or images',
    icon: '🔍',
    accent: 'var(--accent-orange)',
  },
  {
    type: 'classifier',
    label: 'Classifier',
    description: 'Classify into user-defined categories',
    icon: '🏷️',
    accent: 'var(--accent-green)',
  },
  {
    type: 'textViewer',
    label: 'Text Output',
    description: 'Display output from upstream nodes',
    icon: '📄',
    accent: 'var(--accent-blue)',
  },
  {
    type: 'notepad',
    label: 'Note',
    description: 'Annotate your workflow',
    icon: '📝',
    accent: '#f5c542',
  },
  {
    type: 'startTrigger',
    label: 'Global Start',
    description: 'Run all connected nodes',
    icon: '🚀',
    accent: '#61e967',
  },
  {
    type: 'aggregator',
    label: 'Aggregator',
    description: 'Collect multiple outputs into one string',
    icon: '📚',
    accent: '#ffd036',
  },
  {
    type: 'math',
    label: 'Math Ops',
    description: 'Extract numbers and do arithmetic',
    icon: '🔢',
    accent: '#ff4757',
  },
  {
    type: 'router',
    label: 'Condition (IF)',
    description: 'TRUE/FALSE pathing based on text',
    icon: '🔀',
    accent: '#b2bec3',
  },
  {
    type: 'loop',
    label: 'Loop Counter',
    description: 'Standard repeat iterator loop',
    icon: '🔁',
    accent: '#8e44ad',
  },
];

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
}

export function Sidebar({ onAddNode }: SidebarProps) {
  const setIsLibraryOpen = useCanvasStore((s) => s.setLibraryOpen);
  const workflowCount = (useCanvasStore((s) => s.workflows) || []).length;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="sidebar__logo">
            <span className="sidebar__logo-mark">G</span>
            <span className="sidebar__logo-text">Gemma Canvas</span>
          </div>
          <button 
             className="sidebar__library-toggle" 
             onClick={() => setIsLibraryOpen(true)}
             title="My Workflow Library"
          >
             📂 Lab ({workflowCount})
          </button>
        </div>
        <div className="sidebar__subtitle">AI Workflow Builder</div>
      </div>

      <div className="sidebar__section-title">Nodes</div>

      <div className="sidebar__catalog">
        {NODE_CATALOG.map((def) => (
          <div
            key={def.type}
            className="sidebar__node-card"
            style={{ '--card-accent': def.accent } as React.CSSProperties}
            onClick={() => onAddNode(def.type)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/gemma-node-type', def.type);
            }}
          >
            <div className="sidebar__node-icon" style={{ background: `${def.accent}22`, color: def.accent }}>
              {def.icon}
            </div>
            <div className="sidebar__node-info">
              <div className="sidebar__node-name">{def.label}</div>
              <div className="sidebar__node-desc">{def.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__tip">💡 Drag nodes onto canvas or click to add</div>
      </div>
    </aside>
  );
}
