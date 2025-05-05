const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', socket => {
  socket.on('join', room => {
    socket.join(room);
    socket.to(room).emit('viewer-joined', socket.id);
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      socket.to(room).emit('disconnect-peer', socket.id);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});