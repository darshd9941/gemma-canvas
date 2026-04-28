import { useCanvasStore } from '../store';
import './WorkflowLibrary.css';

export function WorkflowLibrary() {
  const workflows = useCanvasStore((s) => s.workflows || []);
  const loadFromLibrary = useCanvasStore((s) => s.loadFromLibrary);
  const deleteFromLibrary = useCanvasStore((s) => s.deleteFromLibrary);
  const isOpen = useCanvasStore((s) => s.libraryOpen);
  const setIsOpen = useCanvasStore((s) => s.setLibraryOpen);

  if (!isOpen) return null;

  return (
    <div className="library-overlay">
      <div className="library-modal">
        <div className="library-modal__header">
          <div className="library-modal__title-group">
            <span className="library-modal__icon">📂</span>
            <h2 className="library-modal__title">My Workflows</h2>
          </div>
          <button className="library-modal__close" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="library-modal__content">
          {workflows.length === 0 ? (
            <div className="library-empty">
              <div className="library-empty__icon">🏜️</div>
              <p>Your library is empty. Generate a workflow and save it to see it here!</p>
            </div>
          ) : (
            <div className="library-grid">
              {workflows.map((w) => (
                <div key={w.id} className="workflow-card">
                  <div className="workflow-card__header">
                    <div className="workflow-card__name">{w.name}</div>
                    <div className="workflow-card__date">
                      {new Date(w.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="workflow-card__prompt-label">INSTRUCTIONS</div>
                  <div className="workflow-card__prompt">"{w.prompt}"</div>
                  <div className="workflow-card__footer">
                    <button 
                      className="workflow-card__btn delete" 
                      onClick={() => {
                        if (confirm('Delete this workflow?')) deleteFromLibrary(w.id);
                      }}
                    >
                      Delete
                    </button>
                    <button 
                      className="workflow-card__btn primary" 
                      onClick={() => loadFromLibrary(w.id)}
                    >
                      Open Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
