import React, { useState, useEffect, useRef } from 'react';
import './PaperIO.css';

const GRID_SIZE = 30;
const CELL_SIZE = 20;
const GAME_SPEED = 150; // milliseconds

const Direction = {
  UP: { x: 0, y: -1 },
  RIGHT: { x: 1, y: 0 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
};

const PaperIO = () => {
  const [player, setPlayer] = useState({
    position: { x: 15, y: 15 },
    direction: Direction.RIGHT,
    territory: [],
    trail: [],
    color: '#4CAF50',
  });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);

  // Initialize player territory
  useEffect(() => {
    const initialTerritory = [];
    for (let x = 14; x <= 16; x++) {
      for (let y = 14; y <= 16; y++) {
        initialTerritory.push({ x, y });
      }
    }
    setPlayer(prev => ({
      ...prev,
      territory: initialTerritory,
    }));
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          if (player.direction !== Direction.DOWN) {
            setPlayer(prev => ({ ...prev, direction: Direction.UP }));
          }
          break;
        case 'ArrowRight':
          if (player.direction !== Direction.LEFT) {
            setPlayer(prev => ({ ...prev, direction: Direction.RIGHT }));
          }
          break;
        case 'ArrowDown':
          if (player.direction !== Direction.UP) {
            setPlayer(prev => ({ ...prev, direction: Direction.DOWN }));
          }
          break;
        case 'ArrowLeft':
          if (player.direction !== Direction.RIGHT) {
            setPlayer(prev => ({ ...prev, direction: Direction.LEFT }));
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [player.direction]);

  // Check if position is in territory
  const isInTerritory = (position, territory) => {
    return territory.some(pos => pos.x === position.x && pos.y === position.y);
  };

  // Check if positions are equal
  const positionsEqual = (pos1, pos2) => pos1.x === pos2.x && pos1.y === pos2.y;

  const findEnclosedCells = (territory, trail) => {
    // Create a combined list of all boundary cells
    const boundary = [...territory, ...trail];
    const boundarySet = new Set(boundary.map(pos => `${pos.x},${pos.y}`));
    
    // Determine the minimum and maximum coordinates to limit our search area
    let minX = GRID_SIZE, minY = GRID_SIZE, maxX = 0, maxY = 0;
    boundary.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });
    
    // Expand search area slightly to ensure we can find outside cells
    minX = Math.max(0, minX - 1);
    minY = Math.max(0, minY - 1);
    maxX = Math.min(GRID_SIZE - 1, maxX + 1);
    maxY = Math.min(GRID_SIZE - 1, maxY + 1);
    
    // Use flood fill from outside to mark cells that are definitely outside
    const outside = new Set();
    const queue = [];
    
    // Start from edges of our search area
    for (let x = minX; x <= maxX; x++) {
      queue.push({x, y: minY}); // Top edge
      queue.push({x, y: maxY}); // Bottom edge
    }
    
    for (let y = minY; y <= maxY; y++) {
      queue.push({x: minX, y}); // Left edge
      queue.push({x: maxX, y}); // Right edge
    }
    
    // BFS to mark all outside cells
    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;
      
      // Skip if already visited or is part of boundary
      if (outside.has(key) || boundarySet.has(key)) continue;
      
      // Mark as outside
      outside.add(key);
      
      // Add neighbors
      const directions = [
        {x: 0, y: -1},  // up
        {x: 1, y: 0},   // right
        {x: 0, y: 1},   // down
        {x: -1, y: 0}   // left
      ];
      
      for (const dir of directions) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        
        // Check bounds
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        
        queue.push({x: nx, y: ny});
      }
    }
    
    // All cells that are not boundary and not outside are enclosed
    const enclosedCells = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        if (!boundarySet.has(key) && !outside.has(key)) {
          enclosedCells.push({x, y});
        }
      }
    }
    
    return enclosedCells;
  };
  

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      if (gameOver) return;

      setPlayer(prev => {
        // Calculate new position
        const newPosition = {
          x: prev.position.x + prev.direction.x,
          y: prev.position.y + prev.direction.y,
        };

        // Check if out of bounds
        if (
          newPosition.x < 0 ||
          newPosition.x >= GRID_SIZE ||
          newPosition.y < 0 ||
          newPosition.y >= GRID_SIZE
        ) {
          setGameOver(true);
          return prev;
        }

        // Check if collided with own trail
        const collidedWithTrail = prev.trail.some(pos => 
          positionsEqual(pos, newPosition)
        );
        if (collidedWithTrail) {
          setGameOver(true);
          return prev;
        }

        // Check if player is in territory
        const inTerritory = isInTerritory(newPosition, prev.territory);

        // Update trail and territory
        let newTrail = [...prev.trail];
        let newTerritory = [...prev.territory];

        if (inTerritory) {
          // If returning to territory, convert trail to territory and capture enclosed cells
          if (newTrail.length > 0) {
            // Find cells enclosed by the loop created by the trail
            const enclosedCells = findEnclosedCells(
              prev.territory, 
              newTrail, 
              newPosition
            );
            
            // Add trail and enclosed cells to territory
            newTerritory = [...newTerritory, ...newTrail, ...enclosedCells];
            setScore(prevScore => prevScore + newTrail.length + enclosedCells.length);
            newTrail = [];
          }
        } else {
          // Outside territory, leave a trail
          newTrail.push(newPosition);
        }

        return {
          ...prev,
          position: newPosition,
          trail: newTrail,
          territory: newTerritory,
        };
      });
    };

    gameLoopRef.current = setInterval(gameLoop, GAME_SPEED);
    return () => clearInterval(gameLoopRef.current);
  }, [gameOver]);

  // Render game on canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw territory
    ctx.fillStyle = player.color;
    player.territory.forEach(pos => {
      ctx.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    // Draw trail
    ctx.fillStyle = '#7CB342';
    player.trail.forEach(pos => {
      ctx.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    // Draw player
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(
      player.position.x * CELL_SIZE,
      player.position.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );
  }, [player]);

  const restartGame = () => {
    setPlayer({
      position: { x: 15, y: 15 },
      direction: Direction.RIGHT,
      territory: [],
      trail: [],
      color: '#4CAF50',
    });
    setGameOver(false);
    setScore(0);

    // Initialize player territory
    const initialTerritory = [];
    for (let x = 14; x <= 16; x++) {
      for (let y = 14; y <= 16; y++) {
        initialTerritory.push({ x, y });
      }
    }
    setPlayer(prev => ({
      ...prev,
      territory: initialTerritory,
    }));
  };

  return (
    <div className="game-container">
      <h1>Paper IO Clone</h1>
      <div className="score">Score: {score}</div>
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        className="game-canvas"
      />
      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <p>Your final score: {score}</p>
          <button onClick={restartGame}>Play Again</button>
        </div>
      )}
      <div className="instructions">
        <p>Use arrow keys to move</p>
        <p>Claim territory by creating loops</p>
        <p>Don't hit your own trail!</p>
      </div>
    </div>
  );
};

export default PaperIO;