import React, { useState, useRef, useEffect } from 'react';
import './App.css';

type Node = { id: number; x: number; y: number };
type Edge = { source: number; target: number; weight: number };
type Mode = 'add-node' | 'add-edge' | 'running';
type DistMatrix = number[][];

type StepState = {
  k: number;
  i: number;
  j: number;
  dist: DistMatrix;
  updated: boolean;
  phase: 'comparing' | 'updated';
};

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<Mode>('add-node');
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  const [stepStates, setStepStates] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initialDist, setInitialDist] = useState<DistMatrix>([]);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let timer: number;
    if (isPlaying && currentStepIndex < stepStates.length - 1) {
      timer = window.setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 200);
    } else if (isPlaying && currentStepIndex >= stepStates.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, stepStates.length]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode === 'running') return;

    if (mode === 'add-node') {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newNode: Node = {
        id: nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) + 1 : 0,
        x,
        y
      };
      setNodes([...nodes, newNode]);
    } else if (mode === 'add-edge') {
      setSelectedNode(null);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    if (mode === 'running') return;
    
    if (mode === 'add-edge') {
      if (selectedNode === null) {
        setSelectedNode(nodeId);
      } else {
        if (selectedNode !== nodeId) {
          const existing = edges.find(ed => ed.source === selectedNode && ed.target === nodeId);
          if (existing) {
            alert('Edge already exists!');
            setSelectedNode(null);
            return;
          }
          
          const randomWeight = Math.floor(Math.random() * 9) + 1;
          setEdges([...edges, { source: selectedNode, target: nodeId, weight: randomWeight }]);
        }
        setSelectedNode(null);
      }
    }
  };

  const runAlgorithm = () => {
    if (nodes.length === 0) return;
    
    setMode('running');
    setSelectedNode(null);
    setCurrentStepIndex(-1);

    const n = nodes.length;
    const dist: DistMatrix = Array(n).fill(0).map(() => Array(n).fill(Infinity));
    
    const nodeIds = nodes.map(n => n.id);
    const idToIndex = (id: number) => nodeIds.indexOf(id);

    for (let i = 0; i < n; i++) dist[i][i] = 0;
    
    edges.forEach(edge => {
      const u = idToIndex(edge.source);
      const v = idToIndex(edge.target);
      dist[u][v] = edge.weight;
    });

    setInitialDist(dist.map(row => [...row]));

    const states: StepState[] = [];
    const currentDist = dist.map(row => [...row]);

    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (currentDist[i][k] !== Infinity && currentDist[k][j] !== Infinity) {
            states.push({
              k, i, j,
              dist: currentDist.map(row => [...row]),
              updated: false,
              phase: 'comparing'
            });

            const newDist = currentDist[i][k] + currentDist[k][j];
            if (newDist < currentDist[i][j]) {
              currentDist[i][j] = newDist;
              states.push({
                k, i, j,
                dist: currentDist.map(row => [...row]),
                updated: true,
                phase: 'updated'
              });
            }
          }
        }
      }
    }

    setStepStates(states);
    setCurrentStepIndex(0);
  };

  const resetAlgorithm = () => {
    setMode('add-node');
    setStepStates([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
  };

  const clearAll = () => {
    resetAlgorithm();
    setNodes([]);
    setEdges([]);
    setInitialDist([]);
  };

  const currentState = currentStepIndex >= 0 && currentStepIndex < stepStates.length 
    ? stepStates[currentStepIndex] 
    : null;

  const displayDist = currentState ? currentState.dist : initialDist.length > 0 ? initialDist : null;

  const renderEdges = () => {
    return edges.map((edge, idx) => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return null;

      const reverseEdge = edges.find(e => e.source === edge.target && e.target === edge.source);
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      const padding = 20;
      const offsetX = (dx / length) * padding;
      const offsetY = (dy / length) * padding;
      
      let x1 = source.x + offsetX;
      let y1 = source.y + offsetY;
      let x2 = target.x - offsetX;
      let y2 = target.y - offsetY;
      
      let pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
      let midX = (x1 + x2) / 2;
      let midY = (y1 + y2) / 2;

      if (reverseEdge && edge.source > edge.target) {
        const curveOffset = 30;
        const nx = -dy / length;
        const ny = dx / length;
        const cx = midX + nx * curveOffset;
        const cy = midY + ny * curveOffset;
        pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
        midX = cx;
        midY = cy - 10;
      } else if (reverseEdge) {
        const curveOffset = 30;
        const nx = -dy / length;
        const ny = dx / length;
        const cx = midX - nx * curveOffset;
        const cy = midY - ny * curveOffset;
        pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
        midX = cx;
        midY = cy - 10;
      }

      let edgeClass = 'edge';
      if (currentState) {
        const sourceIdx = nodes.indexOf(source);
        const targetIdx = nodes.indexOf(target);
        const { i, j, k, phase } = currentState;
        if ((sourceIdx === i && targetIdx === k) || (sourceIdx === k && targetIdx === j)) {
          edgeClass += ' edge-comparing';
        } else if (sourceIdx === i && targetIdx === j && phase === 'updated') {
          edgeClass += ' edge-active';
        }
      }

      return (
        <g key={idx} className={edgeClass}>
          <defs>
            <marker id={`arrow-${idx}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="marker-path" />
            </marker>
          </defs>
          <path d={pathD} markerEnd={`url(#arrow-${idx})`} />
          <rect x={midX - 10} y={midY - 10} width="20" height="20" className="weight-bg" />
          <text x={midX} y={midY + 4} textAnchor="middle" className="weight-label">
            {edge.weight}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <header className="header glass-panel">
          <div className="title text-gradient">Floyd-Warshall Visualizer</div>
          <div className="controls">
            <div className="mode-selector">
              <button 
                className={`mode-btn ${mode === 'add-node' ? 'active' : ''}`}
                onClick={() => setMode('add-node')}
                disabled={mode === 'running'}
              >
                Add Node
              </button>
              <button 
                className={`mode-btn ${mode === 'add-edge' ? 'active' : ''}`}
                onClick={() => setMode('add-edge')}
                disabled={mode === 'running'}
              >
                Add Edge
              </button>
            </div>
            {mode !== 'running' ? (
              <button className="button button-primary" onClick={runAlgorithm} disabled={nodes.length === 0}>
                Run Algorithm
              </button>
            ) : (
              <button className="button" onClick={resetAlgorithm}>
                Stop / Edit
              </button>
            )}
            <button className="button" onClick={clearAll}>Clear All</button>
          </div>
        </header>

        <div className="workspace">
          <svg 
            ref={svgRef} 
            width="100%" 
            height="100%" 
            onClick={handleSvgClick}
            style={{ cursor: mode === 'add-node' ? 'crosshair' : 'default' }}
          >
            {renderEdges()}
            {nodes.map((node, idx) => {
              let nodeClass = "node";
              if (selectedNode === node.id) nodeClass += " node-active";
              
              if (currentState) {
                if (idx === currentState.k) nodeClass += " node-active";
                else if (idx === currentState.i || idx === currentState.j) nodeClass += " node-comparing";
              }

              return (
                <g 
                  key={node.id} 
                  className={nodeClass}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => handleNodeClick(e, node.id)}
                >
                  <circle r="20" />
                  <text y="5" textAnchor="middle">{node.id}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <aside className="side-panel">
        <div className="panel-section">
          <div className="panel-title">Algorithm State</div>
          {mode !== 'running' ? null : (
            <>
              <div className="controls" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button 
                  className="button" 
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }}
                  disabled={currentStepIndex <= 0}
                >⏮ Start</button>
                <button 
                  className="button" 
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(p => Math.max(0, p - 1)); }}
                  disabled={currentStepIndex <= 0}
                >◀ Prev</button>
                <button 
                  className="button button-primary" 
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={currentStepIndex >= stepStates.length - 1}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button 
                  className="button" 
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(p => Math.min(stepStates.length - 1, p + 1)); }}
                  disabled={currentStepIndex >= stepStates.length - 1}
                >Next ▶</button>
              </div>
              
              {currentState && (
                <div className="info-box">
                  <p style={{ marginBottom: '8px' }}>Step {currentStepIndex + 1} of {stepStates.length}</p>
                  <p>Does the path from <strong>i</strong> to <strong>j</strong> become shorter if we go through <strong>k</strong>?</p>
                  <hr style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
                  <p>Intermediate Node (k): <strong>{nodes[currentState.k].id}</strong></p>
                  <p>Source (i): <strong>{nodes[currentState.i].id}</strong>, Dest (j): <strong>{nodes[currentState.j].id}</strong></p>
                  <div className="equation">
                    dist[{currentState.i}][{currentState.j}] = min(
                      {currentState.dist[currentState.i][currentState.j] === Infinity ? '∞' : currentState.dist[currentState.i][currentState.j]}, 
                      {currentState.dist[currentState.i][currentState.k] === Infinity ? '∞' : currentState.dist[currentState.i][currentState.k]} + {currentState.dist[currentState.k][currentState.j] === Infinity ? '∞' : currentState.dist[currentState.k][currentState.j]}
                    )
                  </div>
                  {currentState.phase === 'updated' ? (
                    <p style={{ color: '#f43f5e', marginTop: '8px', fontWeight: 'bold' }}>
                      Yes! Distance updated.
                    </p>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                      No, keeping existing shortest path.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="panel-section">
          <div className="panel-title">Distance Matrix</div>
          <div className="matrix-container">
            {displayDist && displayDist.length > 0 ? (
              <table className="distance-matrix">
                <thead>
                  <tr>
                    <th></th>
                    {nodes.map(n => <th key={n.id}>{n.id}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {displayDist.map((row, i) => (
                    <tr key={i}>
                      <th>{nodes[i].id}</th>
                      {row.map((val, j) => {
                        let cellClass = "";
                        if (currentState) {
                          if (i === currentState.i && j === currentState.j) {
                            cellClass = currentState.phase === 'updated' ? 'cell-updated' : 'cell-active';
                          } else if ((i === currentState.i && j === currentState.k) || (i === currentState.k && j === currentState.j)) {
                            cellClass = 'cell-comparing';
                          }
                        }
                        return (
                          <td key={j} className={cellClass}>
                            {val === Infinity ? '∞' : val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Matrix will be generated when algorithm starts.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
