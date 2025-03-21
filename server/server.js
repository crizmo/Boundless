const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity
  },
});

const players = {}; // Store player data (username, position)

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Handle new player joining
  socket.on('join', ({ username, position }) => {
    players[socket.id] = { username, position };
    io.emit('updatePlayers', players); // Broadcast updated player list
  });

  // Handle player movement
  socket.on('move', (position) => {
    if (players[socket.id]) {
      players[socket.id].position = position;
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