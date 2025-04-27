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

// Define new entities for seeds, plants, and water refill stations
const seedTypes = [
    { type: 'fast', growthTime: 10, points: 1 },
    { type: 'normal', growthTime: 20, points: 2 },
    { type: 'slow', growthTime: 30, points: 3 }
];

const weatherTypes = ['sunny', 'cloudy', 'raining'];
let currentWeather = weatherTypes[0];

function changeWeather() {
    const currentIndex = weatherTypes.indexOf(currentWeather);
    const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    const nextIndex = currentIndex + change;
    if (nextIndex >= 0 && nextIndex < weatherTypes.length) {
        currentWeather = weatherTypes[nextIndex];
    }
}
setInterval(changeWeather, 10000); // Change weather every 10 seconds

function createWaterStation() {
    return {
        type: 'waterStation',
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 30,
        height: 30,
        color: '#00BFFF'
    };
}

function createSeedPools() {
    const seedPoolPositions = [
        { x: canvas.width / 2, y: canvas.height / 2 - 50 }, // Slow
        { x: canvas.width / 2 + 50, y: canvas.height / 2 },     // Normal
        { x: canvas.width / 2, y: canvas.height / 2 + 50 } // Fast
    ];
    return seedPoolPositions.map((pos, index) => ({
        type: 'seedPool',
        x: pos.x,
        y: pos.y,
        width: 30,
        height: 30,
        color: '#8B4513',
        seedType: seedTypes[index].type
    }));
}

// Add water station and seed pools to entities
const waterStation = createWaterStation();
const seedPools = createSeedPools();
gameState.entities.push(waterStation, ...seedPools);

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

        // Teleport opponents if tagged by the owner within their plot
        const playerPlot = gameState.entities.find(e => e.type === 'plot' && e.playerId === player.id);
        if (playerPlot) {
            const plotSize = playerPlot.size * 50;
            const plotLeft = playerPlot.x - plotSize / 2;
            const plotRight = playerPlot.x + plotSize / 2;
            const plotTop = playerPlot.y - plotSize / 2;
            const plotBottom = playerPlot.y + plotSize / 2;

            gameState.players.forEach(opponent => {
                if (opponent.id !== player.id) {
                    const isInPlot = opponent.x > plotLeft && opponent.x < plotRight && opponent.y > plotTop && opponent.y < plotBottom;
                    const ownerDistance = Math.hypot(player.x - opponent.x, player.y - opponent.y);
                    if (isInPlot && ownerDistance < 50) { // If opponent is in plot and owner is close enough
                        const opponentPlot = gameState.entities.find(e => e.type === 'plot' && e.playerId === opponent.id);
                        if (opponentPlot) {
                            opponent.x = opponentPlot.x;
                            opponent.y = opponentPlot.y;
                        }
                    }
                }
            });
        }

        // Check for coin collection
        gameState.entities = gameState.entities.filter(entity => {
            if (entity.type === 'coin') {
                const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
                if (distance < player.width / 2 + entity.width / 2) {
                    player.score += 1;
                    return false; // Remove the coin
                }
            }
            return true;
        });

        // Refill water can if near water station
        if (waterStation && isNear(player, waterStation)) {
            player.waterCan = Math.min(player.waterCan + 10, 100); // Refill gradually, 10 units per frame
        }
    });

    // Update plant growth and water levels for each plot
    gameState.entities.forEach(entity => {
        if (entity.type === 'plot') {
            entity.plants.forEach(row => row.forEach(plant => {
                if (plant && !plant.isDead) {
                    // Update growth
                    plant.growth += 1;
                    // Update water level based on weather
                    if (currentWeather === 'sunny') plant.water -= 0.2; // 10x slower
                    else if (currentWeather === 'cloudy') plant.water -= 0.1; // 10x slower
                    else if (currentWeather === 'raining') plant.water += 0.1; // 10x slower
                    // Check for overwatering
                    if (plant.water > 100) {
                        plant.water = 100;
                        plant.isDead = true;
                    }
                    // Check for underwatering
                    if (plant.water <= 0) {
                        plant.water = 0;
                        plant.isDead = true;
                    }
                }
            }));
        }
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

// Spawn coins at intervals
function createCoin() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = config.spawnRadius; // Use config value

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;

    return {
        type: 'coin',
        x: x,
        y: y,
        width: 10,
        height: 10,
        color: '#FFD700'
    };
}
setInterval(() => {
    if (gameState.lobby.state === LobbyState.GAME_ACTIVE) {
        const coin = createCoin();
        gameState.entities.push(coin);
    }
}, 5000); // Spawn a coin every 5 seconds

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
            case 'plot':
                renderPlot(ctx, entity);
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
            case 'coin':
                if (!gameState.debugMode) {
                    ctx.fillStyle = entity.color;
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y, entity.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (gameState.debugMode) {
                    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y, entity.width / 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
            case 'waterStation':
                ctx.fillStyle = entity.color;
                ctx.fillRect(entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
                break;
            case 'seedPool':
                ctx.fillStyle = entity.color;
                ctx.fillRect(entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(entity.seedType, entity.x, entity.y);
                break;
            default:
                console.warn(`Unknown entity type: ${entity.type}`);
        }
    });

    ctx.restore();

    // Render UIs
    renderGameModeStatus();
    renderLobbyUI(gameState.players, gameState.lobby);
    renderWeatherUI();
    renderPlayerStatsUI();
}

function renderPlot(ctx, plot) {
    const plotSize = plot.size * config.plotSpotSize; // Assuming each tile is 50x50
    const startX = plot.x - plotSize / 2; // Calculate top-left corner from center
    const startY = plot.y - plotSize / 2; // Calculate top-left corner from center
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(startX, startY, plotSize, plotSize);

    const owner = gameState.players.find(p => p.id === plot.playerId);
    if (!owner) return;
    const targetSpot = findClosestSpot(owner, plot);

    plot.plants.forEach((row, rowIndex) => {
        row.forEach((plant, colIndex) => {
            const x = startX + colIndex * config.plotSpotSize;
            const y = startY + rowIndex * config.plotSpotSize;
            if (targetSpot && targetSpot.x === colIndex && targetSpot.y === rowIndex) {
                ctx.strokeStyle = '#FFD700'; // Highlight targeted spot
                ctx.strokeRect(x, y, config.plotSpotSize, config.plotSpotSize);
            }
            if (plant) {
                ctx.fillStyle = plant.isDead ? '#8B0000' : '#228B22'; // Red for dead, green for alive
                ctx.fillRect(x, y, config.plotSpotSize, config.plotSpotSize);
                // Add water level meter
                ctx.fillStyle = '#0000FF';
                ctx.fillRect(x, y + 45, plant.water / 2, 5); // Water level meter
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(plant.growth, x + 25, y + 25);
            }
        });
    });
}

function renderWeatherUI() {
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText(`Weather: ${currentWeather}`, 10, 20);
}

function renderPlayerStatsUI() {
    gameState.players.forEach((player, index) => {
        ctx.fillStyle = player.color;
        ctx.fillText(`Player ${index + 1}: ${player.score} points, Water: ${player.waterCan}`, 10, 40 + index * 20);
    });
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
        score: 0,
        waterCan: 100 // Water can capacity
    };
    gameState.players.push(newPlayer);
    gameState.entities.push(newPlayer);

    // Create and link plot
    const plot = createPlot(newPlayer.id);
    gameState.entities.push(plot);
    return newPlayer;
}

function addNewPlayer(playerId, username) {
    const newPlayer = createPlayer(getRandomColor(), null);
    newPlayer.id = playerId;
    newPlayer.username = username || playerId;
    newPlayer.gamepad = { up: false, down: false, left: false, right: false, A: false, B: false };
}

// Implement planting, watering, and harvesting functions
function plantSeed(player, plot, seedType, x, y) {
    console.log('attempting to plant seed', seedType, x, y, plot.plants[y][x]);
    if (plot.plants[y][x] === null) {
        plot.plants[y][x] = {
            type: seedType,
            growth: 0,
            water: 50 // Initial water level
        };
        player.seeds.quantity -= 1;
    }
}

function waterPlant(player, plot, x, y) {
    const plant = plot.plants[y][x];
    if (plant && player.waterCan > 0) {
        plant.water += 1;
        player.waterCan -= 1;
    }
}

function harvestPlant(player, plot, x, y) {
    const plant = plot.plants[y][x];
    if (plant) {
        if (plant.isDead || plant.growth >= seedTypes.find(s => s.type === plant.type).growthTime) {
            if (!plant.isDead) {
                player.score += seedTypes.find(s => s.type === plant.type).points;
            }
            plot.plants[y][x] = null; // Remove the plant after harvesting or pulling out
        }
    }
}

// Create a separate plot entity
function createPlot(playerId, size = config.plotSpots) {
    const positions = [
        { x: canvas.width / 4, y: canvas.height / 4 },
        { x: (canvas.width / 4) * 3, y: canvas.height / 4 },
        { x: canvas.width / 4, y: (canvas.height / 4) * 3 },
        { x: (canvas.width / 4) * 3, y: (canvas.height / 4) * 3 }
    ];
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
        console.warn(`Player with ID ${playerId} not found.`);
        return null;
    }
    const position = positions[playerIndex % positions.length]; // Use modulo to cycle positions if needed
    return {
        type: 'plot',
        playerId: playerId,
        size: size,
        x: position.x,
        y: position.y,
        plants: Array(size).fill().map(() => Array(size).fill(null))
    };
}

// Update player actions logic
function handlePlayerActions(player) {
    const gamepad = player.gamepad;
    if (!gamepad) return;

    // Grab seeds
    if (gamepad.A) {
        const nearbySeedPool = gameState.entities.find(entity => entity.type === 'seedPool' && isNear(player, entity));
        if (nearbySeedPool) {
            if (!player.seeds || player.seeds.type !== nearbySeedPool.seedType) {
                player.seeds = { type: nearbySeedPool.seedType, quantity: 0 };
            }
            player.seeds.quantity += 1; // Increase quantity
        }
    }

    // Plant seeds
    if (gamepad.A) {
        const plot = gameState.entities.find(e => e.type === 'plot' && e.playerId === player.id);
        if (plot) {
            const closestSpot = findClosestSpot(player, plot);
            if (closestSpot && !plot.plants[closestSpot.y][closestSpot.x]) {
                if (player.seeds && player.seeds.quantity > 0) {
                    plantSeed(player, plot, player.seeds.type, closestSpot.x, closestSpot.y);
                }
            }
        }
    }

    // Water plants
    if (gamepad.B) {
        const plot = gameState.entities.find(e => e.type === 'plot' && e.playerId === player.id);
        if (plot) {
            const closestSpot = findClosestSpot(player, plot);
            if (closestSpot) {
                waterPlant(player, plot, closestSpot.x, closestSpot.y);
            }
        }
    }

    // Harvest plants
    if (gamepad.A) {
        const plot = gameState.entities.find(e => e.type === 'plot' && e.playerId === player.id);
        if (plot) {
            const closestSpot = findClosestSpot(player, plot);
            if (closestSpot) {
                harvestPlant(player, plot, closestSpot.x, closestSpot.y);
            }
        }
    }
}

function isNear(player, entity) {
    const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
    return distance < 50;
}

function findClosestSpot(player, plot) {
    let closestSpot = null;
    let minDistance = Infinity;
    plot.plants.forEach((row, y) => {
        row.forEach((plant, x) => {
            const spotX = plot.x - plot.size * config.plotSpotSize / 2 + x * config.plotSpotSize + config.plotSpotSize / 2; // Center of the spot
            const spotY = plot.y - plot.size * config.plotSpotSize / 2 + y * config.plotSpotSize + config.plotSpotSize / 2; // Center of the spot
            const playerCenterX = player.x;
            const playerCenterY = player.y;
            const distance = Math.hypot(playerCenterX - spotX, playerCenterY - spotY);
            if (distance < minDistance) {
                minDistance = distance;
                closestSpot = { x, y };
            }
        });
    });
    return minDistance < config.plotSpotSize / 1.5 ? closestSpot : null; // Only return if within range
}
