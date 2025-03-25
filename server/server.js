const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const polygonHelper = require('./utils/polygonHelper');
const turf = require('@turf/turf');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity
  },
});

// Define default position constant (matching the client's default)
const DEFAULT_POSITION = [35.6586, 139.7454]; // Tokyo Tower, Japan

const players = {}; // Store player data (username, position, territory, trail)

// Utility function to create starting territory around position
function createInitialTerritory(position) {
  const [lat, lng] = position;
  const radius = 0.0001; // Size of starting territory

  // Create a square territory centered at the player's position
  return [
    [lat + radius, lng + radius],
    [lat + radius, lng - radius],
    [lat - radius, lng - radius],
    [lat - radius, lng + radius]
  ];
}

// Update player score based on territory size
function updatePlayerScore(player) {
  if (player.territory && player.territory.length >= 3) {
    player.score = Math.round(polygonHelper.calculatePolygonArea(player.territory));
  }
}

// Check if a point is inside a polygon
function isPointInPolygon(point, polygon) {
  // Simple ray-casting algorithm
  let inside = false;
  const [x, y] = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

// Handle new player joining
socket.on('join', ({ username, requestedPosition }) => {
  // Use the requested position from client
  let position = requestedPosition || DEFAULT_POSITION;

  // Try to find a valid spawn position
  position = findValidSpawnPosition(position);

  // Send spawn position back to the client
  socket.emit('spawnPosition', position);

  const initialTerritory = createInitialTerritory(position);
  players[socket.id] = {
    username,
    position: position,
    territory: initialTerritory,
    trail: [],
    isInsideTerritory: true,
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
    score: 0 // Initialize score
  };

  // Calculate initial score based on territory
  updatePlayerScore(players[socket.id]);

  // If position is different from requested, notify client
  if (position[0] !== requestedPosition[0] || position[1] !== requestedPosition[1]) {
    socket.emit('invalidSpawnLocation');
  }

  io.emit('updatePlayers', players); // Broadcast updated player list
});

// Find a valid spawn position that's not too close to other players
// and not inside any player's territory
function findValidSpawnPosition(requestedPosition) {
  const MIN_DISTANCE = 0.001; // Minimum distance between players (increased)
  const MAX_ATTEMPTS = 20; // Maximum number of attempts to find a valid position
  
  // Check if the requested position is valid
  if (isValidPosition(requestedPosition)) {
    return requestedPosition;
  }
  
  // Try positions in increasingly larger spirals around the requested position
  const spiralOffsets = [];
  let radius = MIN_DISTANCE;
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Add points in a rough circular pattern
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    spiralOffsets.push([x, y]);
    
    // Increase radius slightly for next iteration
    radius += MIN_DISTANCE * 0.5;
  }
  
  // Try positions based on spiral offsets
  for (const offset of spiralOffsets) {
    const candidatePosition = [
      requestedPosition[0] + offset[0],
      requestedPosition[1] + offset[1]
    ];
    
    if (isValidPosition(candidatePosition)) {
      return candidatePosition;
    }
  }
  
  // If we still haven't found a valid position, try random positions
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Generate a random position within reasonable bounds
    const randomLat = DEFAULT_POSITION[0] + (Math.random() - 0.5) * 0.01;
    const randomLng = DEFAULT_POSITION[1] + (Math.random() - 0.5) * 0.01;
    const randomPosition = [randomLat, randomLng];
    
    if (isValidPosition(randomPosition)) {
      return randomPosition;
    }
  }
  
  // Last resort - find the position furthest from all players
  return findFurthestPosition();
}

// Check if a position is valid (not too close to players and not in any territory)
function isValidPosition(position) {
  // Check distance from other players
  for (const playerId in players) {
    const existingPlayer = players[playerId];
    const [x1, y1] = existingPlayer.position;
    const [x2, y2] = position;
    
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    if (distance < 0.001) { // Increased minimum distance
      return false;
    }
    
    // Check if inside player's territory
    if (existingPlayer.territory && 
        polygonHelper.isPointInPolygon(position, existingPlayer.territory)) {
      return false;
    }
  }
  
  return true;
}

// Find the position furthest from all existing players
function findFurthestPosition() {
  if (Object.keys(players).length === 0) {
    return DEFAULT_POSITION;
  }
  
  const GRID_SIZE = 10;
  let bestPosition = DEFAULT_POSITION;
  let maxMinDistance = 0;
  
  // Create a grid of potential positions
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      // Calculate grid position (around the default position)
      const lat = DEFAULT_POSITION[0] - 0.005 + (i / GRID_SIZE) * 0.01;
      const lng = DEFAULT_POSITION[1] - 0.005 + (j / GRID_SIZE) * 0.01;
      const position = [lat, lng];
      
      // Find minimum distance to any player
      let minDistance = Infinity;
      for (const playerId in players) {
        const existingPlayer = players[playerId];
        const [x1, y1] = existingPlayer.position;
        const [x2, y2] = position;
        
        const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
        minDistance = Math.min(minDistance, distance);
      }
      
      // Check if this position is better than our current best
      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestPosition = position;
      }
    }
  }
  
  return bestPosition;
}

  socket.on('getPlayers', () => {
    socket.emit('updatePlayers', players);
  });

  // Handle player movement
  socket.on('move', (position) => {
    if (players[socket.id]) {
      const player = players[socket.id];
      player.position = position;

      // Check if player is inside their territory
      const wasInside = player.isInsideTerritory;
      player.isInsideTerritory = isPointInPolygon(position, player.territory);

      // Player just left their territory
      if (wasInside && !player.isInsideTerritory) {
        player.trail = [player.position];
      }
      // Player is outside their territory, add to trail
      else if (!player.isInsideTerritory) {
        player.trail.push(position);
      }
      // Player re-entered their territory with a trail
      else if (!wasInside && player.isInsideTerritory && player.trail.length > 1) {
        // Calculate new territory by combining old territory and trail
        const newTerritory = polygonHelper.createPolygon([...player.territory, ...player.trail]);
        player.territory = newTerritory;

        // Check for overlaps with other players' territories
        for (const otherPlayerId in players) {
          if (otherPlayerId !== socket.id) {
            const otherPlayer = players[otherPlayerId];

            // Skip if the other player doesn't have a territory
            if (!otherPlayer.territory || otherPlayer.territory.length < 3) continue;

            // Check if the other player's position is inside the new territory
            if (polygonHelper.isPointInPolygon(otherPlayer.position, newTerritory)) {
              // Player got captured - they're dead
              io.to(otherPlayerId).emit('playerDied', {
                killedBy: socket.id,
                username: player.username
              });

              // Notify the killer
              socket.emit('playerKilled', {
                killed: otherPlayerId,
                username: otherPlayer.username
              });

              // Remove the dead player from the game
              delete players[otherPlayerId];

              // Skip the rest of processing for this dead player
              continue;
            }

            // Check if territories overlap (existing code)
            if (polygonHelper.doPolygonsOverlap(newTerritory, otherPlayer.territory)) {
              // Get points from other player's territory that are inside the new territory
              const pointsToKeep = [];

              for (const point of otherPlayer.territory) {
                // If the point is NOT inside the current player's territory, keep it
                if (!polygonHelper.isPointInPolygon(point, newTerritory)) {
                  pointsToKeep.push(point);
                }
              }

              // Update the other player's territory
              if (pointsToKeep.length >= 3) {
                // Still enough points to form a valid polygon
                otherPlayer.territory = polygonHelper.createPolygon(pointsToKeep);
              } else {
                // Not enough points left, give them a small territory around their position
                otherPlayer.territory = createInitialTerritory(otherPlayer.position);
              }

              // Update other player's score based on new territory
              updatePlayerScore(otherPlayer);

              // Notify players about territory changes
              io.to(otherPlayerId).emit('territoryLost', {
                capturedBy: socket.id,
                username: player.username
              });

              socket.emit('territoryCaptured', {
                capturedFrom: otherPlayerId,
                username: otherPlayer.username
              });
            }
          }
        }

        player.trail = []; // Clear the trail

        // Update player's score based on new territory size
        updatePlayerScore(player);
      }


      io.emit('updatePlayers', players); // Broadcast updated player list
    }
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('updatePlayers', players); // Broadcast updated player list
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});