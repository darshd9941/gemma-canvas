import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';

export type ModelId = 'gemma4:e4b' | 'gemma4:31b' | string;

export type AIBackend = 'ollama' | 'mimo';

export interface OllamaStatus {
  connected: boolean;
  models: string[];
  checking: boolean;
}

export type NodeType =
  | 'textInput'
  | 'imageInput'
  | 'gemmaChat'
  | 'describeImage'
  | 'promptEnhancer'
  | 'textViewer'
  | 'classifier'
  | 'extractor'
  | 'notepad'
  | 'assistant'
  | 'startTrigger'
  | 'aggregator'
  | 'math'
  | 'router'
  | 'dashboard'
  | 'loop';

export interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  // Input content
  text?: string;
  imageDataUrl?: string;
  systemPrompt?: string;
  userPrompt?: string;
  extractQuery?: string;
  classifyOptions?: string;
  // Runtime state
  output?: string;
  running?: boolean;
  error?: string;
  model?: ModelId;
  // Math specific
  operator?: string;
  // Loop / Router specific
  condition?: string;
  maxLoops?: number;
  currentLoop?: number;
}

export interface SavedWorkflow {
  id: string;
  name: string;
  prompt: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  timestamp: number;
}

interface CanvasStore {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedModel: ModelId;
  backend: AIBackend;
  mimoApiKey: string;
  mimoBaseUrl: string;
  mimoModel: string;
  ollamaUrl: string;
  ollamaStatus: OllamaStatus;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  libraryOpen: boolean;
  fitViewTrigger: number;
  workflows: SavedWorkflow[];

  // Node/edge operations
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position?: { x: number; y: number }) => string;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  cloneNode: (id: string) => void;
  clearCanvas: () => void;
  killAllExecution: () => void;
  setGraphData: (nodes: Node<NodeData>[], edges: Edge[]) => void;
  triggerFitView: () => void;

  // Settings
  setSelectedModel: (model: ModelId) => void;
  setBackend: (backend: AIBackend) => void;
  setMimoApiKey: (key: string) => void;
  setMimoBaseUrl: (url: string) => void;
  setMimoModel: (model: string) => void;
  setOllamaUrl: (url: string) => void;
  setOllamaStatus: (status: Partial<OllamaStatus>) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  // Workflow
  saveWorkflow: () => string;
  loadWorkflow: (json: string) => void;
  saveToLibrary: (name: string, prompt: string) => void;
  deleteFromLibrary: (id: string) => void;
  loadFromLibrary: (id: string) => void;
  setLibraryOpen: (open: boolean) => void;
}

const NODE_DEFAULTS: Record<NodeType, Partial<NodeData>> = {
  textInput: { label: 'Text Input', text: '' },
  imageInput: { label: 'Image Input', imageDataUrl: undefined },
  gemmaChat: {
    label: 'Gemma Chat',
    systemPrompt: 'You are a helpful assistant.',
    userPrompt: '',
    output: '',
  },
  describeImage: { label: 'Describe Image', output: '' },
  promptEnhancer: {
    label: 'Prompt Enhancer',
    userPrompt: '',
    output: '',
  },
  textViewer: { label: 'Text Output', output: '' },
  classifier: {
    label: 'Classifier',
    classifyOptions: 'positive, negative, neutral',
    output: '',
  },
  extractor: {
    label: 'Extractor',
    extractQuery: 'Extract the key information.',
    output: '',
  },
  notepad: { label: 'Note', text: '' },
  assistant: { label: 'Assistant #1', text: '', output: '' },
  startTrigger: { label: 'Start Flow' },
  aggregator: { label: 'Data Collector', output: '' },
  math: { label: 'Math Ops', operator: '+', output: '' },
  router: { label: 'Condition (IF)', condition: 'Contains: "yes"', output: '' },
  loop: { label: 'Repeat/Loop', maxLoops: 5, currentLoop: 0, output: '' },
  dashboard: { label: 'Visual Dashboard', output: '' },
};

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedModel: 'gemma4:e4b',
      backend: 'ollama',
      mimoApiKey: '',
      mimoBaseUrl: 'https://token-plan-sgp.xiaomimimo.com/v1',
      mimoModel: 'mimo-v2-omni',
      ollamaUrl: 'http://localhost:11434',
      ollamaStatus: { connected: false, models: [], checking: false },
      sidebarOpen: true,
      settingsOpen: false,
      libraryOpen: false,
      fitViewTrigger: 0,
      workflows: [],

      onNodesChange: (changes) =>
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as Node<NodeData>[] })),

      onEdgesChange: (changes) =>
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

      onConnect: (connection) =>
        set((s) => ({ edges: addEdge({ ...connection, animated: true }, s.edges) })),

      addNode: (type, position) => {
        const id = uuidv4();
        const offset = get().nodes.length * 20;
        const newNode: Node<NodeData> = {
          id,
          type,
          position: position ?? { x: 200 + offset, y: 150 + offset },
          data: {
            nodeType: type,
            ...NODE_DEFAULTS[type],
          } as NodeData,
        };
        set((s) => ({ nodes: [...s.nodes, newNode] }));
        return id;
      },

      updateNodeData: (id, data) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
        })),

      deleteNode: (id) =>
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        })),

      deleteEdge: (id) =>
        set((s) => ({
          edges: s.edges.filter((e) => e.id !== id),
        })),

      cloneNode: (id) => {
        const state = get();
        const target = state.nodes.find((n) => n.id === id);
        if (!target) return;
        const newId = uuidv4();
        const newNode: Node<NodeData> = {
          ...target,
          id: newId,
          position: { x: target.position.x + 30, y: target.position.y + 30 },
          selected: true,
          data: { ...target.data, output: '', running: false, error: undefined },
        };
        const updatedNodes = state.nodes.map((n) => ({ ...n, selected: false }));
        set({ nodes: [...updatedNodes, newNode] });
      },

      clearCanvas: () => set({ nodes: [], edges: [] }),

      killAllExecution: () => {
        set((s) => ({
          nodes: s.nodes.map((n) => ({
            ...n,
            data: { ...n.data, running: false, triggerRun: undefined, error: undefined },
          })),
        }));
      },

      setGraphData: (nodes, edges) => {
        set({ nodes, edges, fitViewTrigger: Date.now() });
      },

      triggerFitView: () => set({ fitViewTrigger: Date.now() }),

      setSelectedModel: (model) => set({ selectedModel: model }),
      setBackend: (backend) => set({ backend }),
      setMimoApiKey: (key) => set({ mimoApiKey: key }),
      setMimoBaseUrl: (url) => set({ mimoBaseUrl: url }),
      setMimoModel: (model) => set({ mimoModel: model }),
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      setOllamaStatus: (status) =>
        set((s) => ({ ollamaStatus: { ...s.ollamaStatus, ...status } })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),

      saveWorkflow: () => {
        const { nodes, edges } = get();
        return JSON.stringify({ nodes, edges, version: '1' }, null, 2);
      },

      loadWorkflow: (json) => {
        try {
          const { nodes, edges } = JSON.parse(json);
          set({ nodes, edges });
        } catch (e) {
          console.error('Failed to load workflow', e);
        }
      },

      saveToLibrary: (name, prompt) => {
        const { nodes, edges, workflows } = get();
        const newWorkflow: SavedWorkflow = {
          id: uuidv4(),
          name,
          prompt,
          nodes,
          edges,
          timestamp: Date.now(),
        };
        set({ workflows: [newWorkflow, ...workflows] });
      },

      deleteFromLibrary: (id) => {
        set((s) => ({
          workflows: s.workflows.filter((w) => w.id !== id),
        }));
      },

      loadFromLibrary: (id) => {
        const workflow = get().workflows.find((w) => w.id === id);
        if (workflow) {
          set({
            nodes: workflow.nodes,
            edges: workflow.edges,
            fitViewTrigger: Date.now(),
            libraryOpen: false,
          });
        }
      },

      setLibraryOpen: (open) => set({ libraryOpen: open }),
    }),
    {
      name: 'gemma-canvas-state',
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 4) {
          if (state.mimoBaseUrl === 'https://api.mimo.xiaomi.com/v1') {
            state.mimoBaseUrl = 'https://token-plan-sgp.xiaomimimo.com/v1';
          }
          const badModels = ['mimo/mimo-v2.5-pro', 'MiMo-V2.5-Pro', 'mimo/mimo-v2.5', 'mimo-v2.5-pro'];
          if (typeof state.mimoModel === 'string' && badModels.includes(state.mimoModel)) {
            state.mimoModel = 'mimo-v2-omni';
          }
        }
        return state;
      },
      partialize: (s) => ({
        nodes: s.nodes.map((n) => ({
          ...n,
          data: { ...n.data, imageDataUrl: undefined },
        })),
        edges: s.edges,
        selectedModel: s.selectedModel,
        backend: s.backend,
        mimoApiKey: s.mimoApiKey,
        mimoBaseUrl: s.mimoBaseUrl,
        mimoModel: s.mimoModel,
        ollamaUrl: s.ollamaUrl,
        workflows: s.workflows.map((w) => ({
          ...w,
          nodes: w.nodes.map((n) => ({
            ...n,
            data: { ...n.data, imageDataUrl: undefined },
          })),
        })),
      }),
    }
  )
);
