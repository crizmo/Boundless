const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const polygonHelper = require('./utils/polygonHelper'); // We'll create this later

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity
  },
});

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
  socket.on('join', ({ username, position }) => {
    const initialTerritory = createInitialTerritory(position);
    players[socket.id] = { 
      username, 
      position, 
      territory: initialTerritory,
      trail: [],
      isInsideTerritory: true,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color
    };
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