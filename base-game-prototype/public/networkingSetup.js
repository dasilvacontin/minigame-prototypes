function renderGameModeStatus() {
    ctx.fillStyle = '#595959';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    const modeText = isOnline 
        ? `Online ${isHost ? '(Host)' : '(Connected to Host)'} | ID: ${socket.id}`
        : 'Local';
    ctx.fillText(
        `Mode: ${modeText}`,
        canvas.width - 16,
        canvas.height - 32
    );
}

let isOnline = false;
let isHost = false;
let socket;

function startLocalGame() {
    document.getElementById('gameModeModal').style.display = 'none';
    setInterval(gameLoop, 1000 / 60);
}

function startOnlineGame() {
    document.getElementById('gameModeModal').style.display = 'none';

    let username;
    do {
        username = prompt("Enter your username:");
        if (!username) {
            alert("Username is required to play online.");
        }
    } while (!username);

    setInterval(gameLoop, 1000 / 60);

    isOnline = true;
    socket = io();

    socket.emit('join', { username });

    socket.on('hostStatus', (data) => {
        isHost = data.isHost;
        if (isHost) {
            console.log('You are now the host');
            synchronizePlayerReferences();
        }
    });

    socket.on('gameState', (gameState) => {
        if (!isHost) {
            updateGameState(gameState);
        }
    });

    socket.on('playerState', (playerState) => {
        if (isHost) {
            console.log('received player state for', playerState.id);
            const player = gameState.players.find(p => p.id === playerState.id);
            if (player) {
                player.gamepad = playerState.gamepad;
            }
        }
    });

    socket.on('newPlayer', (data) => {
        if (isHost) {
            addNewPlayer(data.id, data.username);
        }
    });

    socket.on('removePlayer', (data) => {
        if (isHost) {
            removePlayer(data.id);
        }
    });
}

function synchronizePlayerReferences() {
    gameState.players.forEach(player => {
        const entity = gameState.entities.find(e => e.id === player.id);
        const lobbyPlayer = gameState.lobby.players.find(p => p.id === player.id);

        if (entity) {
            gameState.entities[gameState.entities.indexOf(entity)] = player;
        }

        if (lobbyPlayer) {
            gameState.lobby.players[gameState.lobby.players.indexOf(lobbyPlayer)] = player;
        }
    });
}

function updateGameState(newState) {
    gameState = newState;
}

function getPlayerState() {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
        return {
            id: socket.id,
            gamepad: player.gamepad
        };
    }
    return null;
}

function removePlayer(playerId) {
    gameState.players = gameState.players.filter(player => player.id !== playerId);
    gameState.entities = gameState.entities.filter(entity => entity.id !== playerId);
    gameState.lobby.players = gameState.lobby.players.filter(player => player.id !== playerId);
    console.log(`Player ${playerId} removed from the game`);
}