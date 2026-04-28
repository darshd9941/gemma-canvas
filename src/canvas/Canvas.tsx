import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type Node,
  useReactFlow,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore, type NodeData, type NodeType } from '../store';
import { DeletableEdge } from '../components/DeletableEdge';
import { ContextMenu } from '../components/ContextMenu';
import { WorkflowLibrary } from '../components/WorkflowLibrary';
import { WorkflowAgent } from '../components/WorkflowAgent';
import { TextInputNode } from '../components/TextInputNode';
import { ImageInputNode } from '../components/ImageInputNode';
import { GemmaChatNode } from '../components/GemmaChatNode';
import { DescribeImageNode } from '../components/DescribeImageNode';
import { PromptEnhancerNode } from '../components/PromptEnhancerNode';
import { ExtractorNode } from '../components/ExtractorNode';
import { ClassifierNode } from '../components/ClassifierNode';
import { TextViewerNode } from '../components/TextViewerNode';
import { NotepadNode } from '../components/NotepadNode';
import { AssistantNode } from '../components/AssistantNode';
import { StartNode } from '../components/StartNode';
import { AggregatorNode } from '../components/AggregatorNode';
import { MathNode } from '../components/MathNode';
import { RouterNode } from '../components/RouterNode';
import { LoopNode } from '../components/LoopNode';
import { DashboardNode } from '../components/DashboardNode';
import './Canvas.css';

const nodeTypes: NodeTypes = {
  textInput: TextInputNode,
  imageInput: ImageInputNode,
  gemmaChat: GemmaChatNode,
  describeImage: DescribeImageNode,
  promptEnhancer: PromptEnhancerNode,
  extractor: ExtractorNode,
  classifier: ClassifierNode,
  textViewer: TextViewerNode,
  notepad: NotepadNode,
  assistant: AssistantNode,
  startTrigger: StartNode,
  aggregator: AggregatorNode,
  math: MathNode,
  router: RouterNode,
  loop: LoopNode,
  dashboard: DashboardNode,
};

const edgeTypes: EdgeTypes = {
  deletableEdge: DeletableEdge,
};

const defaultEdgeOptions = { type: 'deletableEdge' };

export function Canvas() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const cloneNode = useCanvasStore((s) => s.cloneNode);
  const killAllExecution = useCanvasStore((s) => s.killAllExecution);
  const fitViewTrigger = useCanvasStore((s) => s.fitViewTrigger);

  const [toolMode, setToolMode] = useState<'arrow' | 'hand'>('arrow');
  const [menuContext, setMenuContext] = useState<{ x: number, y: number, sourceNodeId?: string, sourceHandleId?: string } | null>(null);
  
  const { screenToFlowPosition, fitView } = useReactFlow();

  useEffect(() => {
    if (fitViewTrigger > 0) {
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
    }
  }, [fitViewTrigger, fitView]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const selected = nodes.find(n => n.selected);
        if (selected) {
          navigator.clipboard.writeText(selected.id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then((id) => {
          if (nodes.some(n => n.id === id)) {
            cloneNode(id);
          }
        }).catch(() => {});
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, cloneNode]);

  const onNodeClick = useCallback((e: React.MouseEvent, node: Node) => {
    if (e.altKey) {
      e.stopPropagation();
      cloneNode(node.id);
    }
  }, [cloneNode]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/gemma-node-type') as NodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuContext({ x: e.clientX, y: e.clientY });
  }, []);

  const onConnectEnd = useCallback((e: MouseEvent | TouchEvent, connectionState: any) => {
    if (!connectionState.isValid) {
      const { clientX, clientY } = 'clientX' in e ? e : e.touches[0];
      setMenuContext({
        x: clientX,
        y: clientY,
        sourceNodeId: connectionState.fromNode?.id,
        sourceHandleId: connectionState.fromHandle?.id
      });
    }
  }, []);

  const handleMenuSelect = useCallback((type: NodeType) => {
    if (!menuContext) return;
    const position = screenToFlowPosition({ x: menuContext.x, y: menuContext.y });
    const newNodeId = addNode(type, position);
    
    if (menuContext.sourceNodeId) {
      // Connect to the generic 'in' handle, or 'text-in' for assistant
      const targetHandle = type === 'assistant' ? 'text-in' : 'in';
      onConnect({ 
        source: menuContext.sourceNodeId, 
        sourceHandle: menuContext.sourceHandleId || null, 
        target: newNodeId, 
        targetHandle 
      } as any);
    }
    setMenuContext(null);
  }, [menuContext, addNode, onConnect, screenToFlowPosition]);

  return (
    <div className={`canvas-wrap ${toolMode}-mode`} onDragOver={onDragOver} onDrop={onDrop}>
      <div className="canvas-tools">
        <button className={`tool-btn ${toolMode === 'arrow' ? 'active' : ''}`} onClick={() => setToolMode('arrow')} title="Arrow (Select/Move)">↖️</button>
        <button className={`tool-btn ${toolMode === 'hand' ? 'active' : ''}`} onClick={() => setToolMode('hand')} title="Hand (Pan)">✋</button>
        <div className="tool-separator" />
        <button className="tool-btn danger" onClick={killAllExecution} title="Stop All Running Nodes">🛑 STOP ALL</button>
      </div>

      <ReactFlow
        nodes={nodes as Node<NodeData>[]}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneContextMenu={onPaneContextMenu}
        panOnDrag={toolMode === 'hand' || [1, 2]} // Hand mode or middle/right click
        selectionOnDrag={toolMode === 'arrow'}
        nodesDraggable={toolMode === 'arrow'}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionRadius={75}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const colorMap: Record<string, string> = {
              textInput: '#4f9eff',
              imageInput: '#00d2ff',
              gemmaChat: '#7c5cfc',
              describeImage: '#00d2ff',
              promptEnhancer: '#f471b5',
              extractor: '#ff8c42',
              classifier: '#22d3a5',
              textViewer: '#4f9eff',
              notepad: '#f5c542',
              assistant: '#ffffff',
              startTrigger: '#61e967',
              aggregator: '#ffd036',
              math: '#ff4757',
              router: '#b2bec3',
              loop: '#8e44ad',
              dashboard: '#f39c12',
            };
            return colorMap[n.type ?? ''] ?? '#666';
          }}
          style={{ bottom: 24, right: 24 }}
        />
      </ReactFlow>

      <WorkflowAgent />
      <WorkflowLibrary />

      {nodes.length === 0 && <EmptyState onAdd={addNode} />}
      
      {menuContext && (
        <ContextMenu 
          x={menuContext.x} 
          y={menuContext.y} 
          onSelect={handleMenuSelect}
          onClose={() => setMenuContext(null)} 
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">🎨</div>
      <h2 className="empty-state__title">Your canvas is empty</h2>
      <p className="empty-state__desc">
        Drag nodes from the sidebar, or start with a template
      </p>
      <div className="empty-state__actions">
        <button
          className="empty-state__btn primary"
          onClick={() => {
            onAdd('imageInput', { x: 120, y: 200 });
            onAdd('textInput', { x: 120, y: 550 });
            onAdd('assistant', { x: 500, y: 200 });
          }}
        >
          🗯️ Assistant Flow
        </button>
        <button
          className="empty-state__btn"
          onClick={() => {
            onAdd('textInput', { x: 120, y: 200 });
            onAdd('promptEnhancer', { x: 500, y: 200 });
            onAdd('textViewer', { x: 880, y: 200 });
          }}
        >
          ✨ Prompt Enhancer Flow
        </button>
        <button
          className="empty-state__btn"
          onClick={() => {
            onAdd('imageInput', { x: 120, y: 200 });
            onAdd('describeImage', { x: 480, y: 200 });
            onAdd('textViewer', { x: 840, y: 200 });
          }}
        >
          👁️ Image Describe Flow
        </button>
        <button
          className="empty-state__btn"
          onClick={() => {
            onAdd('textInput', { x: 120, y: 200 });
            onAdd('gemmaChat', { x: 480, y: 200 });
          }}
        >
          🤖 Simple Chat Flow
        </button>
      </div>
    </div>
  );
}
