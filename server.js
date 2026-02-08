const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Store user data (position, nickname, room) in memory
const users = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('login', (data) => {
        const { nickname, roomID } = data;
        socket.join(roomID);
        users[socket.id] = { nickname, roomID, x: Math.random() * 500 + 50, y: Math.random() * 300 + 50 }; // Random initial position

        socket.emit('loginSuccess', users);
        socket.to(roomID).emit('userJoined', { id: socket.id, user: users[socket.id] });
    });

    socket.on('message', (messageData) => {
        const user = users[socket.id];
        if (user) {
            // Broadcast message to everyone in the room, including the sender ID
            io.to(user.roomID).emit('message', {
                senderId: socket.id,
                nickname: user.nickname,
                text: messageData.text
            });
        }
    });

    socket.on('move', (position) => {
        const user = users[socket.id];
        if (user) {
            user.x = position.x;
            user.y = position.y;
            socket.to(user.roomID).emit('userMoved', { id: socket.id, position });
        }
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            socket.to(user.roomID).emit('userLeft', socket.id);
            delete users[socket.id];
            console.log('User disconnected');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
