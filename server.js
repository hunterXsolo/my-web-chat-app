// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve frontend files from /public
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join', ({ username, room }) => {
    socket.join(room);
    socket.data.username = username || 'Anonymous';
    socket.data.room = room;
    console.log(`${socket.id} (${socket.data.username}) joined ${room}`);

    // notify others in room (system message)
    socket.to(room).emit('system-message', {
      message: `${socket.data.username} joined the room`,
      time: Date.now()
    });
  });

  socket.on('leave', (room) => {
    socket.leave(room);
    console.log(`${socket.id} left ${room}`);
    socket.to(room).emit('system-message', {
      message: `${socket.data.username || 'A user'} left the room`,
      time: Date.now()
    });
  });

  socket.on('chat-message', (data) => {
    // forward to everyone in room
    io.to(data.room).emit('chat-message', {
      username: data.username,
      message: data.message,
      time: Date.now(),
      id: socket.id
    });
  });

  socket.on('disconnect', () => {
    const { username, room } = socket.data;
    if (room) {
      socket.to(room).emit('system-message', {
        message: `${username || 'A user'} disconnected`,
        time: Date.now()
      });
    }
    console.log('Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
