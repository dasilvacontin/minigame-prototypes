const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

let host = null;

io.on('connection', (socket) => {
    socket.on('join', ({ username }) => {
        if (!host) {
            host = socket;
            socket.isHost = true;
        }
        socket.emit('hostStatus', { isHost: socket.isHost });

        // Notify the host of a new player
        if (host) {
            host.emit('newPlayer', { id: socket.id, username });
        }
    });

    socket.on('gameState', (gameState) => {
        if (socket.isHost) io.emit('gameState', gameState);
    });

    socket.on('playerState', (playerState) => {
        if (!socket.isHost) host.emit('playerState', playerState);
    });

    socket.on('disconnect', () => {
        if (socket.isHost) {
            host = null;
            // Assign a new host
            for (let client of io.sockets.sockets.values()) {
                if (client !== socket) {
                    host = client;
                    client.isHost = true;
                    client.emit('hostStatus', { isHost: true });
                    console.log(`New host is ${client.id}`);
                    // Inform the new host about the player to remove
                    client.emit('removePlayer', { id: socket.id });
                    break;
                }
            }
        } else if (host) {
            // Inform the current host about the player to remove
            host.emit('removePlayer', { id: socket.id });
        }
    });
});

server.listen(8083, () => {
    console.log('Server running on http://localhost:8083');
}); 