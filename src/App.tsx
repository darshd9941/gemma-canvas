import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './canvas/Canvas';
import { useCanvasStore } from './store';
import './App.css';

function AppInner() {
  const addNode = useCanvasStore((s) => s.addNode);

  return (
    <div className="app">
      <Toolbar />
      <div className="app__body">
        <Sidebar onAddNode={addNode} />
        <Canvas />
      </div>
    </div>
  );
}

// ReactFlowProvider must wrap anything that uses useReactFlow
export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
