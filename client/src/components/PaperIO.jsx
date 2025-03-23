import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './PaperIO.css';

const CELL_SIZE_BASE = 20; // Base cell size at zoom level 18
const GRID_SIZE = 60;
const GAME_SPEED = 150; // milliseconds
const DEFAULT_POSITION = [51.505, -0.09]; // London as default position

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
  const [isPaused, setIsPaused] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(18);
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const mapRef = useRef(null);

  // Calculate cell size based on zoom level
  const getCellSize = () => {
    // Base cell size adjusted by zoom level difference
    return CELL_SIZE_BASE * Math.pow(2, zoomLevel - 18);
  };

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
      // P key to pause/resume
      if (e.key.toLowerCase() === 'p') {
        setIsPaused(prev => !prev);
        return;
      }
      
      // Don't process movement if game is paused
      if (isPaused || gameOver) return;
      
      switch (e.key) {
        // Up controls
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (player.direction !== Direction.DOWN) {
            setPlayer(prev => ({ ...prev, direction: Direction.UP }));
          }
          break;
        // Right controls
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (player.direction !== Direction.LEFT) {
            setPlayer(prev => ({ ...prev, direction: Direction.RIGHT }));
          }
          break;
        // Down controls
        case 'ArrowDown':
        case 's':
        case 'S':
          if (player.direction !== Direction.UP) {
            setPlayer(prev => ({ ...prev, direction: Direction.DOWN }));
          }
          break;
        // Left controls
        case 'ArrowLeft':
        case 'a':
        case 'A':
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
  }, [player.direction, isPaused, gameOver]);

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
      if (gameOver || isPaused) return;

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
              newTrail
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
  }, [gameOver, isPaused]);

  // Render game on canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cellSize = getCellSize();
    
    // Set canvas size based on zoom level
    const canvasSize = GRID_SIZE * cellSize;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(204, 204, 204, 0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, GRID_SIZE * cellSize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(GRID_SIZE * cellSize, i * cellSize);
      ctx.stroke();
    }

    // Draw territory with semi-transparency
    ctx.fillStyle = `${player.color}CC`; // Add alpha channel for semi-transparency
    player.territory.forEach(pos => {
      ctx.fillRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);
    });

    // Draw trail with semi-transparency
    ctx.fillStyle = '#7CB342CC';
    player.trail.forEach(pos => {
      ctx.fillRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);
    });

    // Draw player
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(
      player.position.x * cellSize,
      player.position.y * cellSize,
      cellSize,
      cellSize
    );
  }, [player, zoomLevel]);

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
    setIsPaused(false);

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

  // Map Controller component that tracks zoom and keeps player centered
  const MapController = () => {
    const map = useMap();
    mapRef.current = map;
    
    // Center map on player position initially
    useEffect(() => {
      map.setView(DEFAULT_POSITION, 18);
    }, [map]);
    
    // Track zoom level changes
    useMapEvents({
      zoom: () => {
        setZoomLevel(map.getZoom());
      }
    });
    
    // Keep the player centered as they move
    useEffect(() => {
      if (isPaused || gameOver) return;
      
      // Convert player grid position to equivalent point on the map
      // This is a simplified approach - in a real implementation, you'd need proper coordinate conversion
      const playerLatLng = map.getCenter();
      map.setView(playerLatLng, map.getZoom());
    }, [player.position, map]);
    
    return null;
  };

  return (
    <div className="game-container" style={{ height: '100vh', width: '100vw', padding: 0, margin: 0 }}>
      {/* Score display */}
      <div className="score-display">
        <div className="score">Score: {score}</div>
        {isPaused && <div className="paused-notice">PAUSED</div>}
      </div>
      
      <div className="game-area" style={{ height: '100vh', width: '100vw', margin: 0 }}>
        {/* Map as background */}
        <MapContainer 
          center={DEFAULT_POSITION} 
          zoom={18} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          doubleClickZoom={false}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <MapController />
        </MapContainer>
        
        {/* Game canvas overlay */}
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            className="game-canvas"
          />
        </div>
        
        {gameOver && (
          <div className="game-over">
            <h2>Game Over</h2>
            <p>Your final score: {score}</p>
            <button onClick={restartGame}>Play Again</button>
          </div>
        )}
      </div>
      
      {/* Bottom navbar */}
      <div className="bottom-navbar">
        <button 
          onClick={() => setIsPaused(prev => !prev)}
          className={isPaused ? 'resume-btn' : 'pause-btn'}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <div className="controls-info">
          <p>Press "P" to Pause/Resume • Use Arrow keys or WASD to move</p>
          <p>Zoom with scroll wheel • Claim territory by making loops</p>
        </div>
      </div>
    </div>
  );
};

export default PaperIO;