const playerColors = ['#38C3FF', '#FFD738', '#FF3838', '#9BE993'];
let gameState = {
    entities: [],
    players: [],
    gamepads: [],
    lobby: {
        state: LobbyState.WAITING_FOR_PLAYERS,
        players: [],
        countdown: 0,
        gameDuration: 180, // 3 minutes
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

// Define arena dimensions
const arena = {
    type: 'arena',
    width: canvas.width - 100, // Leave some margin
    height: canvas.height - 100,
    x: 50, // Start position
    y: 50,
    color: '#A3D977' // Garden-like color
};

gameState.entities.push(arena);

// Define chest positions for up to 4 players, adjusted 150px closer to the center
const chestPositions = [
    { x: arena.x + arena.width / 2 - 200, y: arena.y + arena.height / 2 - 200 }, // Top-left corner
    { x: arena.x + arena.width / 2 + 200, y: arena.y + arena.height / 2 - 200 }, // Top-right corner
    { x: arena.x + arena.width / 2 - 200, y: arena.y + arena.height / 2 + 200 }, // Bottom-left corner
    { x: arena.x + arena.width / 2 + 200, y: arena.y + arena.height / 2 + 200 } // Bottom-right corner
];

// Create chests for each player with increased size
chestPositions.forEach((pos, index) => {
    const chest = {
        id: generateUniqueId(),
        type: 'chest',
        x: pos.x,
        y: pos.y,
        width: 50, // Increased width
        height: 50, // Increased height
        playerIndex: index,
        isOpen: false,
        storedTurnips: [] // Array to track stored turnips
    };
    gameState.entities.push(chest);
});

// Constants for headbutt mechanics
const HEADBUTT_RANGE = 50; // Range within which a headbutt can hit
const STUN_DURATION = 60; // Duration of stun in frames (e.g., 1 second at 60 FPS)
const RECOVERY_DURATION = 30; // Recovery time for the attacker in frames

function gameLoop() {
    updateGamepads(gameState);
    lobbyLogic(gameState);
    logic();
    render();
}

function logic() {
    gameState.players.forEach((player, index) => {
        if (!player) return;
        const gamepad = player.gamepad;
        if (!gamepad) return;
        let dx = 0;
        let dy = 0;

        // Update timers
        if (player.stunTimer > 0) player.stunTimer--;
        if (player.recoveryTimer > 0) player.recoveryTimer--;

        // Prevent movement and actions if the player is stunned
        if (player.stunTimer > 0 || player.recoveryTimer > 0) {
            dx = 0;
            dy = 0;
            return; // Skip further actions if stunned
        }

        if (gamepad.up) dy -= 1;
        if (gamepad.down) dy += 1;
        if (gamepad.left) dx -= 1;
        if (gamepad.right) dx += 1;

        // Prevent movement while pulling a turnip or during recovery
        if (player.pullingTurnip) {
            dx = 0;
            dy = 0;
        }

        // Update player direction
        if (dx !== 0 || dy !== 0) {
            player.direction = { dx, dy };
        }

        // Adjust speed based on carrying turnip size
        let speedModifier = 1;
        if (player.carryingTurnip) {
            const size = player.carryingTurnip.size; // 0: Small, 1: Medium, 2: Huge
            if (size === 1) {
                speedModifier = 0.8; // Medium turnip
            } else if (size === 2) {
                speedModifier = 0.5; // Huge turnip
            }
        }

        // Adjust for diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= config.diagonalSpeed;
            dy *= config.diagonalSpeed;
        } else {
            dx *= config.playerSpeed;
            dy *= config.playerSpeed;
        }

        dx *= speedModifier;
        dy *= speedModifier;

        // Check for boundary collisions
        const newX = player.x + dx;
        const newY = player.y + dy;
        if (newX - player.width / 2 < arena.x || newX + player.width / 2 > arena.x + arena.width) {
            dx = 0; // Prevent horizontal movement
        }
        if (newY - player.height / 2 < arena.y || newY + player.height / 2 > arena.y + arena.height) {
            dy = 0; // Prevent vertical movement
        }

        // Check for player-player collisions
        gameState.players.forEach((otherPlayer, otherIndex) => {
            if (index === otherIndex || !otherPlayer) return;
            const distance = Math.hypot(newX - otherPlayer.x, newY - otherPlayer.y);
            const minDistance = player.width / 2 + otherPlayer.width / 2;
            if (distance < minDistance) {
                dx = 0;
                dy = 0;
            }
        });

        // Check for nearby turnips
        if (gamepad.A && !player.carryingTurnip) {
            const nearbyTurnips = gameState.entities.filter(entity => {
                return entity.type === 'turnip' && isNear(player, entity);
            });

            const nearbyTurnip = nearbyTurnips.sort((a, b) => {
                // Prioritize overground turnips
                if (a.state === 'overground' && b.state !== 'overground') return -1;
                if (b.state === 'overground' && a.state !== 'overground') return 1;
                // If both are in the same state, sort by distance
                const distanceA = Math.hypot(player.x - a.x, player.y - a.y);
                const distanceB = Math.hypot(player.x - b.x, player.y - b.y);
                return distanceA - distanceB;
            })[0];

            if (nearbyTurnip) {
                if (nearbyTurnip.state === 'underground') {
                    if (!player.pullingTurnip) {
                        player.pullingTurnip = nearbyTurnip;
                        player.pullingTimer = 0;
                        player.pullingProgress = 0;
                    }
                    player.pullingTimer += 1 / 60; // Assuming 60 FPS
                    const sizeMultiplier = [0.5, 1, 2]; // Halved: Small, Medium, Huge
                    const requiredPullingTime = sizeMultiplier[nearbyTurnip.size];

                    player.pullingProgress = player.pullingTimer / requiredPullingTime; // Adjust pulling progress

                    if (player.pullingTimer >= requiredPullingTime) { // Adjust pulling time based on size
                        nearbyTurnip.state = 'overground';
                        player.carryingTurnip = nearbyTurnip;
                        player.pullingTurnip = null;
                        player.pullingTimer = 0;
                        player.pullingProgress = 0;
                        gameState.entities = gameState.entities.filter(entity => entity !== nearbyTurnip);
                    }
                } else if (nearbyTurnip.state === 'overground') {
                    player.carryingTurnip = nearbyTurnip;
                    gameState.entities = gameState.entities.filter(entity => entity !== nearbyTurnip);
                }
            } else {
                player.pullingTurnip = null;
                player.pullingTimer = 0;
                player.pullingProgress = 0;
            }
        } else {
            player.pullingTurnip = null;
            player.pullingTimer = 0;
            player.pullingProgress = 0;
        }

        // Turnip gets dropped when the player stops holding the A button
        if (!gamepad.A && player.carryingTurnip) {
            // Drop the turnip at the player's current position
            player.carryingTurnip.x = player.x;
            player.carryingTurnip.y = player.y;
            player.carryingTurnip.state = 'overground';
            gameState.entities.push(player.carryingTurnip);
            player.carryingTurnip = null;
        }

        // Update player position and animation
        if (player.isHeadbutting) {
            player.headbuttTimer--;
            if (player.headbuttTimer <= 0) {
                player.isHeadbutting = false;
            } else {
                // Move player slightly forward in the direction they are facing
                player.x += player.direction.dx * 2;
                player.y += player.direction.dy * 2;
            }
        }

        player.x += dx;
        player.y += dy;

        // Check for proximity to player's chest
        const playerChest = gameState.entities.find(entity => entity.type === 'chest' && entity.playerIndex === index);
        if (playerChest && isNear(player, playerChest)) {
            depositTurnip(player, playerChest);
        }

        // Headbutt logic
        if (gamepad.B && !player.carryingTurnip && player.recoveryTimer <= 0) {
            player.isHeadbutting = true;
            player.headbuttTimer = 5; // Duration of the headbutt animation, reduced to half
            gameState.players.forEach((opponent, opponentIndex) => {
                if (index === opponentIndex || !opponent || opponent.stunTimer > 0) return;
                // Calculate the headbutt AOE center based on the player's direction
                const headbuttCenterX = player.x + player.direction.dx * (player.width / 2);
                const headbuttCenterY = player.y + player.direction.dy * (player.width / 2);
                const distance = Math.hypot(headbuttCenterX - opponent.x, headbuttCenterY - opponent.y);
                if (distance < HEADBUTT_RANGE) {
                    opponent.stunTimer = STUN_DURATION;
                    // Interrupt pulling if the opponent is pulling a turnip
                    opponent.pullingTurnip = null;
                    opponent.pullingTimer = 0;
                    opponent.pullingProgress = 0;
                    if (opponent.carryingTurnip) {
                        opponent.carryingTurnip.x = opponent.x;
                        opponent.carryingTurnip.y = opponent.y;
                        opponent.carryingTurnip.state = 'overground';
                        gameState.entities.push(opponent.carryingTurnip);
                        opponent.carryingTurnip = null;
                    }

                    // Calculate push direction
                    const pushDirectionX = opponent.x - headbuttCenterX;
                    const pushDirectionY = opponent.y - headbuttCenterY;
                    const pushMagnitude = Math.hypot(pushDirectionX, pushDirectionY);
                    const normalizedPushX = (pushDirectionX / pushMagnitude) * 100; // Adjust push strength
                    const normalizedPushY = (pushDirectionY / pushMagnitude) * 100;

                    // Apply push with reduced strength
                    opponent.x += normalizedPushX / 2;
                    opponent.y += normalizedPushY / 2;
                }
            });
            
            // Player enters recovery mode, regardless of whether they hit an opponent or not
            player.recoveryTimer = RECOVERY_DURATION;
        }
    });

    // Update chest timers
    gameState.entities.forEach(entity => {
        if (entity.type === 'chest' && entity.isOpen) {
            entity.timer -= 1;
            if (entity.timer <= 0) {
                entity.isOpen = false;
            }
        }
    });

    // Resolve player collisions
    for (let i = 0; i < gameState.players.length; i++) {
        for (let j = i + 1; j < gameState.players.length; j++) {
            const playerA = gameState.players[i];
            const playerB = gameState.players[j];

            const distance = Math.hypot(playerA.x - playerB.x, playerA.y - playerB.y);
            const minDistance = playerA.width / 2 + playerB.width / 2;

            if (distance < minDistance) {
                // Calculate push vector
                const overlap = minDistance - distance;
                const pushX = (playerA.x - playerB.x) / distance * overlap / 2;
                const pushY = (playerA.y - playerB.y) / distance * overlap / 2;

                // Apply push
                playerA.x += pushX;
                playerA.y += pushY;
                playerB.x -= pushX;
                playerB.y -= pushY;
            }
        }
    }

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
    
    // Sort entities by y position, but render turnips last
    gameState.entities.sort((a, b) => {
        if (a.type === 'turnip' && b.type !== 'turnip') return 1;
        if (b.type === 'turnip' && a.type !== 'turnip') return -1;
        return a.y - b.y;
    });

    gameState.entities.forEach((entity) => {
        switch (entity.type) {
            case 'arena':
                // Draw the arena
                ctx.fillStyle = entity.color;
                ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
                break;
            case 'player':
                ctx.save();
                // Visual feedback for speed change
                if (entity.carryingTurnip) {
                    const size = entity.carryingTurnip.size;
                    const speedModifier = 1 - (size * 0.1);
                    if (speedModifier < 1) {
                        ctx.globalAlpha = 0.7; // Make player semi-transparent when slowed
                    }
                }
                // Visual effect for stunned players
                if (entity.stunTimer > 0) {
                    ctx.globalAlpha = 0.5; // Make player more transparent when stunned
                }
                if (entity.recoveryTimer > 0) {
                    ctx.globalAlpha = 0.5; // Make player more transparent during recovery
                }
                // Render player with headbutt animation
                if (entity.isHeadbutting) {
                    // Move the player slightly forward in the direction they are facing
                    const headbuttOffsetX = entity.direction.dx * entity.width / 2; // Adjust offset as needed
                    const headbuttOffsetY = entity.direction.dy * entity.height / 2; // Adjust offset as needed
                    ctx.translate(headbuttOffsetX, headbuttOffsetY);
                }
                renderPlayer(ctx, entity, entity.gamepad);
                // Visual effect for stunned players
                if (entity.stunTimer > 0) {
                    const numStars = 5;
                    const radius = 15; // Radius of the circular path
                    const currentTime = Date.now();
                    for (let i = 0; i < numStars; i++) {
                        const angle = (currentTime / 1000 + i * (2 * Math.PI / numStars)) % (2 * Math.PI);
                        const starX = entity.x + Math.cos(angle) * radius;
                        const starY = entity.y - entity.height / 2 - 10 + Math.sin(angle) * radius;
                        ctx.fillStyle = '#FFD700'; // Gold color for stars
                        ctx.beginPath();
                        ctx.arc(starX, starY, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                if (entity.carryingTurnip) {
                    // Render the turnip above the player's head using the renderTurnip function
                    const turnipX = entity.x;
                    const turnipY = entity.y - entity.height / 2 - entity.carryingTurnip.width / 2;
                    renderTurnip(ctx, entity.carryingTurnip, turnipX, turnipY);
                }
                // Render direction indicator
                ctx.strokeStyle = '#FFFFFF'; // Set stroke color to white
                ctx.lineWidth = 2; // Set stroke width
                ctx.beginPath();
                ctx.moveTo(entity.x, entity.y);
                ctx.lineTo(entity.x + entity.direction.dx * (entity.width / 2), entity.y + entity.direction.dy * (entity.width / 2)); // Set length to half the player's width
                ctx.stroke();
                ctx.restore();
                break;
            case 'turnip':
                if (entity.state === 'underground') {
                    // Render only the stem
                    ctx.fillStyle = '#228B22'; // Green stem color
                    ctx.fillRect(entity.x - 2, entity.y - 15, 4, 15); // Longer stem

                    // Render pulling progress circle
                    const pullingPlayer = gameState.players.find(p => p.pullingTurnip && p.pullingTurnip.id === entity.id);
                    if (pullingPlayer) {
                        ctx.strokeStyle = '#000000'; // Black color for progress
                        ctx.lineWidth = 3;
                        const progressRadius = 15; // Fixed radius for progress circle
                        ctx.beginPath();
                        ctx.arc(entity.x, entity.y, progressRadius, -Math.PI / 2, (2 * Math.PI * pullingPlayer.pullingProgress) - Math.PI / 2);
                        ctx.stroke();
                    }
                } else if (entity.state === 'overground') {
                    renderTurnip(ctx, entity, entity.x, entity.y);
                }
                break;
            case 'chest':
                renderChest(ctx, entity);
                break;
            case 'sign':
                // Make the sign invisible during GAME_ACTIVE or GAME_OVER
                if (gameState.lobby.state !== LobbyState.GAME_ACTIVE && gameState.lobby.state !== LobbyState.GAME_OVER) {
                    ctx.fillStyle = entity.color;
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

function createTurnip(sizeIndex) {
    const centerX = arena.x + arena.width / 2;
    const centerY = arena.y + arena.height / 2;
    const radius = 100; // Define a radius around the center for spawning

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    const sizes = [10, 20, 40]; // Small, Medium, Huge
    const size = sizes[sizeIndex];

    return {
        type: 'turnip',
        id: generateUniqueId(),
        x: x,
        y: y,
        width: size,
        height: size,
        state: 'underground', // Initial state
        size: sizeIndex, // 0: Small, 1: Medium, 2: Huge
        color: '#FFB347' // Turnip color
    };
}

// Spawn initial players and turnips
function spawnEntities() {
    // Player spawning is handled in input.js, no need to spawn here

    // Define the size pattern: 2 huge, 4 medium, 6 small
    const sizePattern = [2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0];

    // Spawn 20 turnips
    for (let i = 0; i < 20; i++) {
        const sizeIndex = sizePattern[i % sizePattern.length];
        const turnip = createTurnip(sizeIndex);
        gameState.entities.push(turnip);
    }
}

function createPlayer(color, gamepadIndex) {
    const centerX = arena.x + arena.width / 2;
    const centerY = arena.y + arena.height / 2;
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
        score: 0,
        recoveryTimer: 0,
        stunTimer: 0,
        pullingTurnip: null,
        pullingTimer: 0,
        pullingProgress: 0,
        direction: { dx: 1, dy: 0 }, // Default direction facing right
        isHeadbutting: false, // Initial headbutt state
        headbuttTimer: 0 // Initial headbutt timer
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

function isNear(player, entity) {
    const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
    return distance < 50;
}

// Function to render a turnip
function renderTurnip(ctx, turnip, x, y) {
    // Render the full turnip with gradient
    const gradient = ctx.createRadialGradient(x, y, turnip.width / 4, x, y, turnip.width / 2);
    gradient.addColorStop(0, '#FFFFFF'); // White body
    gradient.addColorStop(1, '#FFB347'); // Light orange
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, turnip.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Render the purple top
    ctx.fillStyle = '#800080'; // Purple top
    ctx.beginPath();
    ctx.arc(x, y - turnip.width / 4, turnip.width / 4, 0, Math.PI * 2);
    ctx.fill();

    // Render the stem
    ctx.fillStyle = '#228B22';
    ctx.fillRect(x - 2, y - turnip.width / 2 - 10, 4, 10); // Adjusted stem
}

// Update chest rendering logic
function renderChest(ctx, chest) {
    const player = gameState.players[chest.playerIndex];
    if (!player) return;

    // Draw the stroke around the chest with player's color
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(chest.x - chest.width / 2 - 5, chest.y - chest.height / 2 - 5, chest.width + 10, chest.height + 10);

    // Draw the chest base
    ctx.fillStyle = '#8B4513'; // Brown color for the chest
    ctx.fillRect(chest.x - chest.width / 2, chest.y - chest.height / 2, chest.width, chest.height);

    // Draw the lid (always open)
    ctx.fillStyle = '#D2B48C'; // Tan color for the open lid
    ctx.fillRect(chest.x - chest.width / 2, chest.y - chest.height / 2 - 5, chest.width, 5);

    // Render stored turnips inside the chest
    chest.storedTurnips.forEach((turnip) => {
        const hash = Array.from(turnip.id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const offsetX = (hash % (chest.width - turnip.width)) - chest.width / 2 + turnip.width / 2;
        const offsetY = (hash % (chest.height - turnip.height)) - chest.height / 2 + turnip.height / 2;
        renderTurnip(ctx, turnip, chest.x + offsetX, chest.y + offsetY);
    });

    // Display player's name and score below the chest
    ctx.fillStyle = '#000000'; // Black color for text
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${player.username}'s chest`, chest.x, chest.y + chest.height / 2 + 15);
    ctx.fillText(`Score: ${player.score}`, chest.x, chest.y + chest.height / 2 + 30);
}

// Update logic to store turnips in chest
function depositTurnip(player, chest) {
    if (player.carryingTurnip) {
        // Animate chest opening
        chest.isOpen = true;
        chest.timer = 30; // Open for 0.5 seconds (assuming 60 FPS)

        // Award points based on turnip size
        const size = player.carryingTurnip.size;
        const points = [1, 2, 4][size];
        player.score += points;

        // Add turnip to chest's storedTurnips
        chest.storedTurnips.push(player.carryingTurnip);

        // Remove turnip from player
        player.carryingTurnip = null;
    }
}

function roundStart() {
    // Spawn turnips at the start of the round
    spawnEntities();
}

function roundEnd() {
    // Gets called when the game is over
    gameState.entities = gameState.entities.filter(entity => entity.type !== 'turnip');
}

function gameReset() {
    // Gets called when the game should finish showing 'endgame' stuff
    // and should reset so that another game can start
    gameState.entities.forEach(entity => {
        if (entity.type === 'chest') {
            entity.storedTurnips = [];
        }
    });

    gameState.players.forEach(player => {
        if (player.carryingTurnip) {
            player.carryingTurnip = null;
        }
    });
}