# Final Report — AI Pathfinding Visualizer

## Abstract
This project implements an interactive visualizer for common pathfinding algorithms (BFS, DFS, Dijkstra, A*, Bidirectional A*) on a 2D grid. It demonstrates algorithm behavior, performance differences, and path reconstruction.

## Introduction
Pathfinding is crucial in robotics, games, and mapping. Visual tools help students and developers understand how algorithms explore state spaces.

## Objectives
- Implement and visualize multiple pathfinding algorithms.
- Provide interactive controls (walls, start/end points, speed, grid-size).
- Add keyboard controls for quick testing.
- Include an advanced algorithm: Bidirectional A* for faster searches.

## Design & Implementation
### Data structures
- Grid: 2D array of node objects (`{r,c,type,weight,parent}`).
- Priority Queue: binary min-heap for Dijkstra and A*.
- Sets (JS `Set`) for visited/closed tracking.

### Algorithms
- **BFS:** queue-based exploration; guarantees shortest path on unweighted graphs.
- **DFS:** stack-based; not guaranteed shortest; useful to compare exploration patterns.
- **Dijkstra:** priority-queue by accumulated distance; works with weights.
- **A\*:** priority = g(n) + h(n) where h is Manhattan distance—effective heuristic for grids.
- **Bidirectional A\*:** two simultaneous A* searches from start and goal; when their frontiers meet, the algorithm reconstructs a path using meeting node and parent maps. This reduces explored nodes on many maps.

### Visualization
- Node states: empty, start, end, wall, frontier, visited, path.
- Color coding in CSS.
- Animation speed controlled via slider; each algorithm step updates DOM to reflect frontier/visited changes.

## Results & Analysis
- BFS explores uniformly outward; Dijkstra/A* focus on cost-optimal routes, visiting fewer nodes when heuristic is informative.
- Bidirectional A* often reduces runtime and visited nodes for large open areas by meeting in the middle, but requires careful merging of parent pointers for reconstruction.

## Usage
Open `index.html` and interact with the UI. Use keyboard shortcuts for rapid testing.

## Limitations & Future Work
- The Bidirectional A* is a basic implementation — merging and tie-breaking can be improved.
- Add weighted cell editing, diagonal movement, better maze generators, and performance optimizations (canvas rendering, WebWorkers).
- Add unit tests and profiling metrics.

## Conclusion
This visualizer is an educational tool showcasing how algorithm choices affect search behavior. The addition of Bidirectional A* provides a taste of advanced search strategies and performance trade-offs.
