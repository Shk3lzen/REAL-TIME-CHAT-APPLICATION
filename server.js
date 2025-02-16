require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const redisHandler = require('./src/handlers/redisHandler');
const socketHandler = require('./src/handlers/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Initialize Redis handler and socket handler
const redis = redisHandler.init();
socketHandler.init(io, redis);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
