const playerColors = ['#38C3FF', '#FFD738', '#FF3838', '#9BE993'];
let gameState = {
    entities: [],
    players: [],
    gamepads: [],
    lobby: {
        state: LobbyState.WAITING_FOR_PLAYERS,
        players: [],
        countdown: 0,
        gameDuration: 60,
        gameActive: false,
        winner: null
    },
    debugMode: false
};
const sign = {
    type: 'sign',
    x: canvas.width / 2 - 50,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    color: '#ECECEC'
};
gameState.entities.push(sign);

function gameLoop() {
    updateGamepads(gameState);
    lobbyLogic(gameState);
    gameState.players.forEach(handlePlayerActions);
    logic();
    render();
}

function logic() {
    gameState.players.forEach((player) => {
        if (!player) return;
        const gamepad = player.gamepad;
        if (!gamepad) return;
        let dx = 0;
        let dy = 0;

        if (gamepad.up) dy -= 1;
        if (gamepad.down) dy += 1;
        if (gamepad.left) dx -= 1;
        if (gamepad.right) dx += 1;

        if (dx !== 0 && dy !== 0) {
            dx *= config.diagonalSpeed;
            dy *= config.diagonalSpeed;
        } else {
            dx *= config.playerSpeed;
            dy *= config.playerSpeed;
        }

        player.x += dx;
        player.y += dy;
    });

    // Send game state to the server
    if (isOnline && socket) {
        if (isHost) {
            socket.emit('gameState', gameState);
        } else {
            const playerState = getPlayerState();
            if (playerState) {
                socket.emit('playerState', playerState);
            }
        }
    }
}

function render() {
    ctx.save();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center the camera on the local player if playing online
    if (isOnline) {
        const localPlayer = gameState.players.find(p => p.id === socket.id);
        if (localPlayer) {
            const offsetX = canvas.width / 2 - localPlayer.x;
            const offsetY = canvas.height / 2 - localPlayer.y;
            ctx.translate(offsetX, offsetY);
        }
    }
    
    // sort entities by y position
    gameState.entities.sort((a, b) => a.y - b.y);

    gameState.entities.forEach((entity) => {
        switch (entity.type) {
            case 'player':
                renderPlayer(ctx, entity, entity.gamepad);
                break;
            case 'sign':
                ctx.fillStyle = '#ECECEC';

                const crossThickness = 8;
                ctx.fillRect(entity.x - crossThickness / 2, entity.y - entity.height / 2, crossThickness, entity.height);
                ctx.fillRect(entity.x - entity.width / 2, entity.y - 20, entity.width, 28);

                // Check for players close to the sign
                const nearbyPlayer = gameState.players.find(player => {
                    const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
                    return distance < 50;
                });

                if (nearbyPlayer) {
                    ctx.fillStyle = '#000000';
                    ctx.font = '14px Sk-Modernist';
                    ctx.textAlign = 'center';
                    const text = (gameState.lobby.state === LobbyState.GAME_ACTIVE || gameState.lobby.state === LobbyState.GAME_OVER) 
                        ? 'Game in progress...' 
                        : 'Press A to join the contest';
                    ctx.fillText(text, entity.x + entity.width / 2, entity.y - 10);
                }
                break;
            default:
                console.warn(`Unknown entity type: ${entity.type}`);
        }
    });

    ctx.restore();

    // Render UIs
    renderGameModeStatus();
    renderLobbyUI(gameState.players, gameState.lobby);
}

function createPlayer(color, gamepadIndex) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = config.spawnRadius;

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    const newPlayer = {
        type: 'player',
        id: generateUniqueId(),
        gamepadIndex: gamepadIndex,
        x: x,
        y: y,
        width: 50,
        height: 50,
        color: color,
        score: 0
    };
    gameState.players.push(newPlayer);
    gameState.entities.push(newPlayer);

    return newPlayer;
}

function addNewPlayer(playerId, username) {
    const newPlayer = createPlayer(getRandomColor(), null);
    newPlayer.id = playerId;
    newPlayer.username = username || playerId;
    newPlayer.gamepad = { up: false, down: false, left: false, right: false, A: false, B: false };
}

// Update player actions logic
function handlePlayerActions(player) {
    const gamepad = player.gamepad;
    if (!gamepad) return;

    if (gamepad.A) {
    }

    if (gamepad.B) {
    }
}

function isNear(player, entity) {
    const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
    return distance < 50;
}