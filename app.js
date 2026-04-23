// AI Pathfinding Visualizer - plain JS (index.html + styles.css + this file)
// Added: keyboard controls, Bidirectional A* algorithm, separate files structure

// --- Utilities & Data structures ---
class PriorityQueue {
  constructor(){ this.heap = [] }
  push(item, priority){ this.heap.push({item,priority}); this._bubbleUp(this.heap.length-1) }
  pop(){ if(!this.heap.length) return null; const top=this.heap[0].item; const last=this.heap.pop(); if(this.heap.length){ this.heap[0]=last; this._sinkDown(0) } return top }
  isEmpty(){ return this.heap.length===0 }
  _bubbleUp(n){ const el=this.heap[n]; while(n>0){ const parentN=Math.floor((n+1)/2)-1; const parent=this.heap[parentN]; if(el.priority>=parent.priority) break; this.heap[parentN]=el; this.heap[n]=parent; n=parentN } }
  _sinkDown(n){ const length=this.heap.length; const el=this.heap[n]; while(true){ const leftN=2*(n+1)-1; const rightN=leftN+1; let swap=null; if(leftN<length){ if(this.heap[leftN].priority<el.priority) swap=leftN } if(rightN<length){ if((swap===null && this.heap[rightN].priority<el.priority) || (swap!==null && this.heap[rightN].priority<this.heap[leftN].priority)) swap=rightN } if(swap===null) break; this.heap[n]=this.heap[swap]; this.heap[swap]=el; n=swap } }
}

// Node types
const NODE_EMPTY='empty', NODE_START='start', NODE_END='end', NODE_WALL='wall', NODE_VISITED='visited', NODE_FRONTIER='frontier', NODE_PATH='path';

// State
let rows = 20, cols = 30;
let grid = [];
let startPos = {r: Math.floor(rows/2), c: Math.floor(cols/6)};
let endPos = {r: Math.floor(rows/2), c: Math.floor((cols/6)*5)};
let mouseDown=false, placing='wall';
let running=false;
let visitedCount=0,pathLen=0;

// DOM refs
const gridContainer = document.getElementById('gridContainer');
const algSelect = document.getElementById('algorithm');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');
const clearBtn = document.getElementById('clearBtn');
const mazeBtn = document.getElementById('mazeBtn');
const speedInput = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const visitedEl = document.getElementById('visited');
const pathEl = document.getElementById('pathLen');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const applySize = document.getElementById('applySize');

speedInput.addEventListener('input', ()=>{ speedVal.textContent = speedInput.value + ' ms' });

function makeGrid(r, c){
  grid = [];
  for(let i=0;i<r;i++){
    const row=[];
    for(let j=0;j<c;j++){
      let type = NODE_EMPTY;
      if(i===startPos.r && j===startPos.c) type=NODE_START;
      else if(i===endPos.r && j===endPos.c) type=NODE_END;
      row.push({r:i,c:j,type,weight:1,parent:null});
    }
    grid.push(row);
  }
  renderGrid();
  visitedCount=0; pathLen=0; updateMeta();
}

function renderGrid(){
  gridContainer.innerHTML = '';
  const gridEl = document.createElement('div');
  gridEl.className = 'grid';
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
  gridEl.style.gap = '2px';

  for(const row of grid){
    for(const node of row){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = node.r; cell.dataset.c = node.c;
      applyCellClass(cell,node.type);

      cell.addEventListener('mousedown',(e)=>{ e.preventDefault(); onMouseDown(node.r,node.c,e.button); });
      cell.addEventListener('mouseenter',()=>{ onMouseEnter(node.r,node.c); });
      cell.addEventListener('mouseup',()=>{ onMouseUp(); });
      cell.addEventListener('dblclick',()=>{ toggleWall(node.r,node.c); });

      gridEl.appendChild(cell);
    }
  }
  gridContainer.appendChild(gridEl);
  document.addEventListener('mouseup', onMouseUp);
}

function applyCellClass(el,type){ el.className='cell'; if(type===NODE_START) el.classList.add('start'); else if(type===NODE_END) el.classList.add('end'); else if(type===NODE_WALL) el.classList.add('wall'); else if(type===NODE_VISITED) el.classList.add('visited'); else if(type===NODE_FRONTIER) el.classList.add('frontier'); else if(type===NODE_PATH) el.classList.add('path'); }

function toggleWall(r,c){ if(r===startPos.r && c===startPos.c) return; if(r===endPos.r && c===endPos.c) return; const node = grid[r][c]; node.type = node.type===NODE_WALL?NODE_EMPTY:NODE_WALL; renderGrid(); }

function onMouseDown(r,c,button){ if(running) return; mouseDown=true; const node = grid[r][c]; if(button===0){ if(node.type===NODE_START) placing=NODE_START; else if(node.type===NODE_END) placing=NODE_END; else placing=NODE_WALL; if(placing===NODE_WALL){ if(node.type!==NODE_START && node.type!==NODE_END) node.type = node.type===NODE_WALL?NODE_EMPTY:NODE_WALL; } } renderGrid(); }
function onMouseEnter(r,c){ if(!mouseDown || running) return; const node = grid[r][c]; if(placing===NODE_WALL){ if(node.type!==NODE_START && node.type!==NODE_END) node.type = NODE_WALL; } else if(placing===NODE_START){ const old = grid[startPos.r][startPos.c]; old.type = NODE_EMPTY; node.type = NODE_START; startPos={r,c}; } else if(placing===NODE_END){ const old = grid[endPos.r][endPos.c]; old.type = NODE_EMPTY; node.type = NODE_END; endPos={r,c}; } renderGrid(); }
function onMouseUp(){ mouseDown=false; placing='wall'; }

function getNeighbors(node){
  const neighbors=[];
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dr,dc] of dirs){ const nr=node.r+dr, nc=node.c+dc; if(nr>=0&&nr<rows&&nc>=0&&nc<cols) neighbors.push(grid[nr][nc]); }
  return neighbors;
}
function manhattan(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function visualize(algo){
  if(running) return; clearPaths(); running=true; visitedCount=0; updateMeta();
  const start = grid[startPos.r][startPos.c];
  const end = grid[endPos.r][endPos.c];
  let found=false;

  if(algo==='bfs'){
    const q=[]; q.push(start); const seen=new Set([`${start.r},${start.c}`]);
    while(q.length){ const node=q.shift(); if(node.type!==NODE_START && node.type!==NODE_END) node.type=NODE_VISITED; visitedCount++; updateMeta(); if(node.r===end.r && node.c===end.c){ found=true; break; } const neighbors=getNeighbors(node).filter(n=>n.type!==NODE_WALL && !seen.has(`${n.r},${n.c}`)); for(const nb of neighbors){ seen.add(`${nb.r},${nb.c}`); nb.parent=node; if(nb.type!==NODE_START && nb.type!==NODE_END) nb.type=NODE_FRONTIER; q.push(nb); } renderGrid(); await sleep(Number(speedInput.value)); }
  } else if(algo==='dfs'){
    const stack=[start]; const seen=new Set([`${start.r},${start.c}`]);
    while(stack.length){ const node=stack.pop(); if(node.type!==NODE_START && node.type!==NODE_END) node.type=NODE_VISITED; visitedCount++; updateMeta(); if(node.r===end.r && node.c===end.c){ found=true; break; } const neighbors=getNeighbors(node).filter(n=>n.type!==NODE_WALL && !seen.has(`${n.r},${n.c}`)); for(const nb of neighbors){ seen.add(`${nb.r},${nb.c}`); nb.parent=node; if(nb.type!==NODE_START && nb.type!==NODE_END) nb.type=NODE_FRONTIER; stack.push(nb); } renderGrid(); await sleep(Number(speedInput.value)); }
  } else if(algo==='dijkstra' || algo==='astar'){
    const dist = Array(rows).fill(0).map(()=>Array(cols).fill(Infinity)); dist[start.r][start.c]=0; const pq = new PriorityQueue(); pq.push(start,0); const seen=new Set();
    while(!pq.isEmpty()){
      const node = pq.pop();
      const key=`${node.r},${node.c}`;
      if(seen.has(key)) continue;
      seen.add(key);
      if(node.type!==NODE_START && node.type!==NODE_END) node.type=NODE_VISITED;
      visitedCount++; updateMeta();
      if(node.r===end.r && node.c===end.c){ found=true; break; }
      const neighbors=getNeighbors(node).filter(n=>n.type!==NODE_WALL);
      for(const nb of neighbors){
        const alt = dist[node.r][node.c] + nb.weight;
        if(alt < dist[nb.r][nb.c]){
          dist[nb.r][nb.c] = alt;
          nb.parent = node;
          const priority = algo==='dijkstra'?alt:alt+manhattan(nb,end);
          pq.push(nb,priority);
          if(nb.type!==NODE_START && nb.type!==NODE_END) nb.type=NODE_FRONTIER;
        }
      }
      renderGrid();
      await sleep(Number(speedInput.value));
    }
  } else if(algo==='biastar'){
    // Bidirectional A* (basic implementation)
    // Two open sets with heuristics; alternate expansions. When searches meet, reconstruct path.
    const startNode = grid[startPos.r][startPos.c];
    const endNode = grid[endPos.r][endPos.c];

    const openF = new PriorityQueue(); // forward
    const openB = new PriorityQueue(); // backward
    const gScoreF = Array(rows).fill(0).map(()=>Array(cols).fill(Infinity));
    const gScoreB = Array(rows).fill(0).map(()=>Array(cols).fill(Infinity));
    const closedF = new Set();
    const closedB = new Set();
    const parentsF = {}; // key -> parent key
    const parentsB = {};
    gScoreF[startNode.r][startNode.c] = 0;
    gScoreB[endNode.r][endNode.c] = 0;
    openF.push(startNode, manhattan(startNode,endNode));
    openB.push(endNode, manhattan(endNode,startNode));
    let meetingKey = null;

    while(!openF.isEmpty() && !openB.isEmpty()){
      // forward step
      const nodeF = openF.pop();
      const keyF = `${nodeF.r},${nodeF.c}`;
      if(closedF.has(keyF)) continue;
      closedF.add(keyF);
      if(nodeF.type!==NODE_START && nodeF.type!==NODE_END) nodeF.type = NODE_VISITED;
      visitedCount++; updateMeta();
      if(closedB.has(keyF)){ meetingKey = keyF; break; }

      const neighborsF = getNeighbors(nodeF).filter(n=>n.type!==NODE_WALL);
      for(const nb of neighborsF){
        const tentative = gScoreF[nodeF.r][nodeF.c] + nb.weight;
        if(tentative < gScoreF[nb.r][nb.c]){
          gScoreF[nb.r][nb.c] = tentative;
          parentsF[`${nb.r},${nb.c}`] = keyF;
          const prio = tentative + manhattan(nb, endNode);
          openF.push(nb, prio);
          if(nb.type!==NODE_START && nb.type!==NODE_END) nb.type = NODE_FRONTIER;
        }
      }

      // backward step
      const nodeB = openB.pop();
      const keyB = `${nodeB.r},${nodeB.c}`;
      if(closedB.has(keyB)) continue;
      closedB.add(keyB);
      if(nodeB.type!==NODE_START && nodeB.type!==NODE_END) nodeB.type = NODE_VISITED;
      visitedCount++; updateMeta();
      if(closedF.has(keyB)){ meetingKey = keyB; break; }

      const neighborsB = getNeighbors(nodeB).filter(n=>n.type!==NODE_WALL);
      for(const nb of neighborsB){
        const tentative = gScoreB[nodeB.r][nodeB.c] + nb.weight;
        if(tentative < gScoreB[nb.r][nb.c]){
          gScoreB[nb.r][nb.c] = tentative;
          parentsB[`${nb.r},${nb.c}`] = keyB;
          const prio = tentative + manhattan(nb, startNode);
          openB.push(nb, prio);
          if(nb.type!==NODE_START && nb.type!==NODE_END) nb.type = NODE_FRONTIER;
        }
      }

      renderGrid();
      await sleep(Number(speedInput.value));
    }

    if(meetingKey){
      // reconstruct path from meetingKey using parentsF and parentsB
      const [mr, mc] = meetingKey.split(',').map(Number);
      const pathF = [];
      let k = meetingKey;
      while(k && k in parentsF){
        const [pr,pc] = k.split(',').map(Number);
        pathF.push({r:pr,c:pc});
        k = parentsF[k];
      }
      const pathB = [];
      k = meetingKey;
      while(k && k in parentsB){
        const [pr,pc] = k.split(',').map(Number);
        pathB.push({r:pr,c:pc});
        k = parentsB[k];
      }
      // combine
      const full = pathF.concat([{r:mr,c:mc}], pathB.reverse());
      pathLen = full.length;
      updateMeta();
      for(const p of full){
        if(!(p.r===startPos.r && p.c===startPos.c) && !(p.r===endPos.r && p.c===endPos.c)){
          grid[p.r][p.c].type = NODE_PATH;
        }
        renderGrid();
        await sleep(Math.max(8, Number(speedInput.value)));
      }
    }

    running=false;
    return;
  }

  // reconstruct path if found (single-direction algorithms)
  if(found){
    let curr = grid[end.r][end.c];
    const path = [];
    while(curr && !(curr.r===start.r && curr.c===start.c)){
      path.push(curr);
      curr = curr.parent;
    }
    pathLen = path.length;
    updateMeta();
    for(let i=path.length-1;i>=0;i--){
      const node = path[i];
      if(node.type!==NODE_START && node.type!==NODE_END) node.type = NODE_PATH;
      renderGrid();
      await sleep(Math.max(10, Number(speedInput.value)));
    }
  }

  running=false;
}

function clearPaths(){ for(const row of grid){ for(const node of row){ if([NODE_VISITED,NODE_FRONTIER,NODE_PATH].includes(node.type)) node.type = NODE_EMPTY; node.parent = null; } } renderGrid(); visitedCount=0; pathLen=0; updateMeta(); }
function resetGrid(){ startPos = {r: Math.floor(rows/2), c: Math.floor(cols/6)}; endPos = {r: Math.floor(rows/2), c: Math.floor((cols/6)*5)}; makeGrid(rows,cols); }

function updateMeta(){ visitedEl.textContent = visitedCount; pathEl.textContent = pathLen; }

function simpleRandomMaze(){ if(running) return; for(const row of grid){ for(const node of row){ if(node.type===NODE_START || node.type===NODE_END) continue; node.type = Math.random() < 0.25 ? NODE_WALL : NODE_EMPTY; } } renderGrid(); }

runBtn.addEventListener('click', ()=>{ visualize(algSelect.value); });
resetBtn.addEventListener('click', ()=>{ if(running) return; resetGrid(); });
clearBtn.addEventListener('click', ()=>{ if(running) return; clearPaths(); });
mazeBtn.addEventListener('click', ()=>{ if(running) return; simpleRandomMaze(); });
applySize.addEventListener('click', ()=>{ if(running) return; const r = Math.max(8,Math.min(40,Number(rowsInput.value))); const c = Math.max(8,Math.min(60,Number(colsInput.value))); rows=r; cols=c; startPos = {r: Math.floor(rows/2), c: Math.floor(cols/6)}; endPos = {r: Math.floor(rows/2), c: Math.floor((cols/6)*5)}; makeGrid(rows,cols); });

// Keyboard controls
document.addEventListener('keydown', (e)=>{
  if(e.key === '1') algSelect.value = 'bfs';
  else if(e.key === '2') algSelect.value = 'dfs';
  else if(e.key === '3') algSelect.value = 'dijkstra';
  else if(e.key === '4') algSelect.value = 'astar';
  else if(e.key === '5') algSelect.value = 'biastar';
  else if(e.key.toLowerCase() === 'r') { visualize(algSelect.value); }
  else if(e.key.toLowerCase() === 'c') { clearPaths(); }
  else if(e.key.toLowerCase() === 'm') { simpleRandomMaze(); }
  else if(e.key === '+') { speedInput.value = Math.max(5, Number(speedInput.value)-5); speedVal.textContent = speedInput.value + ' ms'; }
  else if(e.key === '-') { speedInput.value = Math.min(200, Number(speedInput.value)+5); speedVal.textContent = speedInput.value + ' ms'; }
});

// init
makeGrid(rows,cols);