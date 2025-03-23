const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const polygonHelper = require('./utils/polygonHelper');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity
  },
});

// Define default position constant (matching the client's default)
const DEFAULT_POSITION = [52.26927690226104, -113.81143282313303];

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
    const position = requestedPosition || DEFAULT_POSITION;
    
    // Validate the position is within acceptable bounds if needed
    // For example, check it's not inside another player's territory
    let isValidPosition = true;
    
    // Simple check - ensure position isn't too close to another player
    for (const playerId in players) {
      const existingPlayer = players[playerId];
      const [x1, y1] = existingPlayer.position;
      const [x2, y2] = position;
      
      const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
      if (distance < 0.0005) { // Too close to another player
        isValidPosition = false;
        break;
      }
    }
    
    // If position is invalid, choose a random valid position
    const finalPosition = isValidPosition ? position : DEFAULT_POSITION;
    
    // Send spawn position back to the client
    socket.emit('spawnPosition', finalPosition);
    
    const initialTerritory = createInitialTerritory(finalPosition);
    players[socket.id] = { 
      username, 
      position: finalPosition, 
      territory: initialTerritory,
      trail: [],
      isInsideTerritory: true,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
      score: 0 // Initialize score
    };
    
    // Calculate initial score based on territory
    updatePlayerScore(players[socket.id]);
    
    if (!isValidPosition) {
      socket.emit('invalidSpawnLocation');
    }
    
    io.emit('updatePlayers', players); // Broadcast updated player list
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
        const newArea = [...player.territory, ...player.trail];
        // Use algorithm to simplify and create a proper polygon
        player.territory = polygonHelper.createPolygon([...player.territory, ...player.trail]);
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