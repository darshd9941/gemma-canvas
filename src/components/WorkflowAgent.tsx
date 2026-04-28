import { useState } from 'react';
import { useCanvasStore } from '../store';
import { buildGraphFromPrompt, parseGeneratedGraph } from '../aiBuilder';
import './WorkflowAgent.css';

export function WorkflowAgent() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenPrompt, setLastGenPrompt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  
  const setNodesEdges = useCanvasStore((s) => s.setGraphData);
  const saveToLibrary = useCanvasStore((s) => s.saveToLibrary);
  const model = useCanvasStore((s) => s.selectedModel);
  const fitView = useCanvasStore((s) => s.triggerFitView); // we'll need to mock or trigger this

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setSaved(false);
    
    try {
      const { rawJson } = await buildGraphFromPrompt(prompt, model);
      const graph = parseGeneratedGraph(rawJson);
      
      if (setNodesEdges) {
         setNodesEdges(graph.nodes, graph.edges);
      }
      setLastGenPrompt(prompt);
      setPrompt('');
    } catch (e: any) {
      setError(e.message || "Failed to parse workflow.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workflow-agent">
      <div className="workflow-agent__header">
        <span className="workflow-agent__icon">🪄</span>
        <span className="workflow-agent__title">AI Workflow Builder</span>
      </div>
      
      <div className="workflow-agent__input-wrapper">
        <textarea
          className="workflow-agent__input"
          placeholder="e.g. Make a workflow for checking my meta ads, finding visual hotspots..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          disabled={loading}
        />
        <button 
          className="workflow-agent__submit" 
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? <div className="assistant-spinner" /> : 'Build'}
        </button>
      </div>
      
      {error && (
        <div className="workflow-agent__error">
          {error}. The model might have made a syntax mistake. Try again.
        </div>
      )}

      {lastGenPrompt && !loading && (
        <div className="workflow-agent__success-actions">
           {!saved ? (
             <button 
               className="workflow-agent__save-btn" 
               onClick={() => {
                 const name = lastGenPrompt.split(' ').slice(0, 5).join(' ') + '...';
                 saveToLibrary(name, lastGenPrompt);
                 setSaved(true);
               }}
             >
               💾 Save this Workflow
             </button>
           ) : (
             <div className="workflow-agent__saved-tag">✓ Saved to Library</div>
           )}
        </div>
      )}
    </div>
  );
}
