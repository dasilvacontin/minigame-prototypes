// Define constants for garden dimensions and tile size
const GARDEN_WIDTH = 800;
const GARDEN_HEIGHT = 600;
const TILE_SIZE = 50;

// Define constants for gnome behavior
const GNOME_MAX_DISTANCE = 300; // Maximum distance gnomes can see
const GNOME_VISION_CONE_ANGLE = Math.PI / 180 * 35; // 35 degrees in radians
const GNOME_SPEED_CHASING = 1; // Speed when chasing a player
const GNOME_SPEED_PATROLLING = 0.5; // Speed when patrolling
const GNOME_DETECTION_RANGE = 300; // Detection range for gnomes

// Define constants for player behavior
const PLAYER_VISIBILITY_THRESHOLD = 2; // Time in seconds a player must be visible to be caught
const PLAYER_RESPAWN_TIME = 3; // Time in seconds before a player respawns
const PLAYER_SPEED_BOOST_DURATION = 1; // Time in seconds for speed boost after collecting a plant
const PLAYER_SPEED_BOOST_MULTIPLIER = 1.5; // Speed multiplier when boost is active

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
    debugMode: false,
    gardenGrid: Array.from({ length: GARDEN_HEIGHT / TILE_SIZE }, () => Array(GARDEN_WIDTH / TILE_SIZE).fill(null))
};

const sign = {
    type: 'sign',
    x: GARDEN_WIDTH / 2, // Center of the garden width
    y: GARDEN_HEIGHT / 2, // Center of the garden height
    width: 50,
    height: 50,
    color: '#ECECEC'
};
gameState.entities.push(sign);

const playerColors = ['#38C3FF', '#FFD738', '#FF3838', '#9BE993'];

// Utility function to convert position to grid coordinates
function positionToGrid(x, y) {
    return {
        gridX: Math.floor(x / TILE_SIZE),
        gridY: Math.floor(y / TILE_SIZE)
    };
}

// Utility function to convert grid coordinates to position
function gridToPosition(gridX, gridY) {
    return {
        x: gridX * TILE_SIZE + TILE_SIZE / 2,
        y: gridY * TILE_SIZE + TILE_SIZE / 2
    };
}

// Utility function to find an empty spot on the grid
function findEmptySpot() {
    let gridX, gridY, cell;
    do {
        gridX = Math.floor(Math.random() * (GARDEN_WIDTH / TILE_SIZE));
        gridY = Math.floor(Math.random() * (GARDEN_HEIGHT / TILE_SIZE));
        cell = gameState.gardenGrid[gridY][gridX];
    } while (cell); // Retry if the cell is not empty
    return { gridX, gridY };
}

// Function to place a plant on the grid
function placePlant(type, gridX, gridY) {
    const { x, y } = gridToPosition(gridX, gridY);
    const plant = { id: generateUniqueId(), type: 'plant', plantType: type, x: x, y: y };
    gameState.gardenGrid[gridY][gridX] = plant;
    gameState.entities.push(plant);
}

// Function to place a hiding spot on the grid
function placeHidingSpot(gridX, gridY) {
    const { x, y } = gridToPosition(gridX, gridY);
    const hidingSpot = { id: generateUniqueId(), type: 'hidingSpot', x: x, y: y };
    gameState.gardenGrid[gridY][gridX] = hidingSpot;
    gameState.entities.push(hidingSpot);
}

// Function to place an obstacle on the grid
function placeObstacle(gridX, gridY) {
    const { x, y } = gridToPosition(gridX, gridY);
    const obstacle = { id: generateUniqueId(), type: 'obstacle', x: x, y: y };
    gameState.gardenGrid[gridY][gridX] = obstacle;
    gameState.entities.push(obstacle);
}

// Function to place a plant randomly on the grid
function placePlantRandomly(type) {
    const { gridX, gridY } = findEmptySpot();
    placePlant(type, gridX, gridY);
}

// Function to place a hiding spot randomly on the grid
function placeHidingSpotRandomly() {
    const { gridX, gridY } = findEmptySpot();
    placeHidingSpot(gridX, gridY);
}

// Function to place an obstacle randomly on the grid
function placeObstacleRandomly() {
    const { gridX, gridY } = findEmptySpot();
    placeObstacle(gridX, gridY);
}

// Example placement of interactive elements
for (let i = 0; i < 20; i++) { // Add 20 random obstacles
    placeObstacleRandomly();
}

// Function to create a gnome entity
function createGnome() {
    const { gridX, gridY } = findEmptySpot();
    const { x, y } = gridToPosition(gridX, gridY);
    const gnome = {
        id: generateUniqueId(),
        type: 'gnome',
        x: x,
        y: y,
        speed: 1,
        direction: Math.random() * 2 * Math.PI, // Random initial direction
        waitTimer: 0
    };
    gameState.entities.push(gnome);
    return gnome;
}

// A* pathfinding algorithm
function aStarPathfinding(start, goal, grid) {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(start, 0);
    fScore.set(start, heuristic(start, goal));

    const maxIterations = 1000; // Set a maximum number of iterations
    let iterations = 0;

    while (openSet.length > 0) {
        if (iterations++ > maxIterations) {
            console.warn('Pathfinding exceeded maximum iterations');
            return []; // Return an empty path if the maximum iterations are exceeded
        }

        // Get the node in openSet with the lowest fScore
        openSet.sort((a, b) => fScore.get(a) - fScore.get(b));
        const current = openSet.shift();

        if (current.gridX === goal.gridX && current.gridY === goal.gridY) {
            return reconstructPath(cameFrom, current);
        }

        const neighbors = getNeighbors(current, grid);
        for (const neighbor of neighbors) {
            const tentativeGScore = gScore.get(current) + 1; // Assume each move costs 1

            if (tentativeGScore < (gScore.get(neighbor) || Infinity)) {
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeGScore);
                fScore.set(neighbor, tentativeGScore + heuristic(neighbor, goal));

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    
    console.log('No path found');
    return []; // Return an empty path if no path is found
}

// Heuristic function for A* pathfinding
function heuristic(a, b) {
    return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
}

// Get neighbors for A* pathfinding
function getNeighbors(node, grid) {
    const neighbors = [];
    const directions = [
        { gridX: 1, gridY: 0 }, { gridX: -1, gridY: 0 },
        { gridX: 0, gridY: 1 }, { gridX: 0, gridY: -1 },
        { gridX: 1, gridY: 1 }, { gridX: 1, gridY: -1 },
        { gridX: -1, gridY: 1 }, { gridX: -1, gridY: -1 }
    ]; // Right, Left, Down, Up, and Diagonals

    for (const dir of directions) {
        const neighborX = node.gridX + dir.gridX;
        const neighborY = node.gridY + dir.gridY;

        if (neighborX >= 0 && neighborX < grid[0].length &&
            neighborY >= 0 && neighborY < grid.length) {
            const cell = grid[neighborY][neighborX];
            if (!cell || cell.type !== 'obstacle') { // Only consider non-obstacles
                // For diagonal movement, check adjacent horizontal and vertical tiles
                if (Math.abs(dir.gridX) + Math.abs(dir.gridY) === 2) { // Diagonal
                    const adjacent1 = grid[node.gridY][neighborX];
                    const adjacent2 = grid[neighborY][node.gridX];
                    if ((adjacent1 && adjacent1.type === 'obstacle') ||
                        (adjacent2 && adjacent2.type === 'obstacle')) {
                        continue; // Skip if either adjacent tile is an obstacle
                    }
                }
                neighbors.push({ gridX: neighborX, gridY: neighborY });
            }
        }
    }

    return neighbors;
}

// Reconstruct path for A* pathfinding
function reconstructPath(cameFrom, current) {
    const totalPath = [current];
    while (cameFrom.has(current)) {
        current = cameFrom.get(current);
        totalPath.unshift(current);
    }
    return totalPath;
}

// Check if gnome has line of sight to player
function hasLineOfSight(gnome, player) {
    const dx = player.x - gnome.x;
    const dy = player.y - gnome.y;
    const distance = Math.hypot(dx, dy);
    if (distance > GNOME_MAX_DISTANCE) return false; // Player is too far away

    const steps = Math.ceil(distance / (TILE_SIZE / 4));
    const stepX = dx / steps;
    const stepY = dy / steps;

    // Calculate the angle to the player
    const angleToPlayer = Math.atan2(dy, dx);
    // Calculate the difference between the gnome's direction and the angle to the player
    const angleDifference = Math.abs(angleToPlayer - gnome.direction);
    // Normalize the angle difference to be within [0, Math.PI]
    const normalizedAngleDifference = Math.min(angleDifference, Math.abs(2 * Math.PI - angleDifference));

    // Check if the player is within the vision cone
    if (normalizedAngleDifference > GNOME_VISION_CONE_ANGLE) {
        return false; // Player is outside the vision cone
    }

    for (let i = 1; i <= steps; i++) {
        const checkX = gnome.x + stepX * i;
        const checkY = gnome.y + stepY * i;
        const { gridX, gridY } = positionToGrid(checkX, checkY);

        if (gridX >= 0 && gridX < GARDEN_WIDTH / TILE_SIZE &&
            gridY >= 0 && gridY < GARDEN_HEIGHT / TILE_SIZE) {
            const cell = gameState.gardenGrid[gridY][gridX];
            if (cell && (cell.type === 'obstacle' || cell.type === 'hidingSpot')) {
                return false; // Line of sight is blocked
            }
        }
    }
    return true; // No obstacles or hiding spots block the line of sight
}

// Function to determine a random patrol target, prioritizing spots near flowers
function getRandomPatrolTarget(gnome) {
    const allPlants = gameState.entities.filter(entity => entity.type === 'plant');
    if (allPlants.length > 0 && Math.random() < 0.7) { // 70% chance to patrol near a flower    
        const plant = allPlants[Math.floor(Math.random() * allPlants.length)];
        return { x: plant.x, y: plant.y };
    }
    // If no plants are available, choose a random nearby spot
    let targetX, targetY, path;
    let attempts = 0;
    do {
        const randomAngle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 300; // Random distance within a 300px radius
        targetX = gnome.x + Math.cos(randomAngle) * distance;
        targetY = gnome.y + Math.sin(randomAngle) * distance;
        const start = positionToGrid(gnome.x, gnome.y);
        const goal = positionToGrid(targetX, targetY);
        const goalIsWithinBounds = goal.gridX >= 0 && goal.gridX < GARDEN_WIDTH / TILE_SIZE &&
            goal.gridY >= 0 && goal.gridY < GARDEN_HEIGHT / TILE_SIZE;
        
        // Check if the goal is not an obstacle, only if it's within bounds, otherwise
        // array access may throw an error
        let goalIsNotObstacle = false;
        if (goalIsWithinBounds) {
            const cell = gameState.gardenGrid[goal.gridY] && gameState.gardenGrid[goal.gridY][goal.gridX];
            goalIsNotObstacle = !cell || cell.type !== 'obstacle';
        }

        if (goalIsWithinBounds && goalIsNotObstacle) {
            path = aStarPathfinding(start, goal, gameState.gardenGrid);
            if (path.length > 0) {
                break;
            }
        }
        attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
        return null;
    }

    return { x: targetX, y: targetY };
}

// Linear interpolation function for angles
function lerpAngle(start, end, t) {
    const twoPi = Math.PI * 2;
    const difference = (end - start) % twoPi;
    const shortestAngle = (2 * difference) % twoPi - difference;
    return start + shortestAngle * t;
}

// Update gnome patrolling logic to chase players or patrol
function updateGnomePatrol(gnome) {
    if (gnome.waitTimer > 0) {
        gnome.waitTimer -= 1 / 60; // Decrement wait timer assuming 60 FPS
        if (gnome.waitTimer <= 0) {
            gnome.lastKnownPosition = null; // Clear last known position after waiting
        }
        return; // Skip further updates while waiting
    }

    let targetPlayer = null;
    let targetPosition = gnome.lastKnownPosition || gnome.targetPosition || null; // Use gnome's targetPosition if available

    const visiblePlayers = gameState.players.filter(player => hasLineOfSight(gnome, player));
    const nearestPlayer = visiblePlayers.reduce((closest, player) => {
        const distance = Math.hypot(player.x - gnome.x, player.y - gnome.y);
        return distance < GNOME_DETECTION_RANGE && (!closest || distance < closest.distance) ? { player, distance } : closest;
    }, null);

    let targetDirection = gnome.direction; // Default to current direction

    if (nearestPlayer) {
        targetPlayer = nearestPlayer.player;
        targetPosition = { x: targetPlayer.x, y: targetPlayer.y };
        gnome.lastKnownPosition = targetPosition;
        gnome.speed = GNOME_SPEED_CHASING; // Full speed when chasing a player

        // Calculate target direction towards the player
        const dx = targetPlayer.x - gnome.x;
        const dy = targetPlayer.y - gnome.y;
        targetDirection = Math.atan2(dy, dx);
    } else if (targetPosition && Math.hypot(targetPosition.x - gnome.x, targetPosition.y - gnome.y) < (TILE_SIZE * 1.5) || !targetPosition) {
        // If reached the last known position, start waiting
        if (gnome.lastKnownPosition) {
            gnome.waitTimer = 1; // Wait for 1 second
        }
        // If no players are visible, switch to patrolling
        targetPosition = getRandomPatrolTarget(gnome);
        gnome.targetPosition = targetPosition; // Store the new target position
        gnome.lastKnownPosition = null;
        gnome.speed = GNOME_SPEED_PATROLLING; // Half speed when patrolling randomly
    }

    if (targetPosition) {
        const start = positionToGrid(gnome.x, gnome.y);
        const goal = positionToGrid(targetPosition.x, targetPosition.y);
        const path = aStarPathfinding(start, goal, gameState.gardenGrid);

        if (path.length > 1) { // Move towards the next step in the path
            const nextStep = path[1];
            const { x: targetX, y: targetY } = gridToPosition(nextStep.gridX, nextStep.gridY);
            const dx = targetX - gnome.x;
            const dy = targetY - gnome.y;
            const distance = Math.hypot(dx, dy);

            if (distance > 0) {
                const moveX = (dx / distance) * gnome.speed;
                const moveY = (dy / distance) * gnome.speed;

                const newX = gnome.x + moveX;
                const newY = gnome.y + moveY;
                const { gridX, gridY } = positionToGrid(newX, newY);

                if (gridX >= 0 && gridX < GARDEN_WIDTH / TILE_SIZE &&
                    gridY >= 0 && gridY < GARDEN_HEIGHT / TILE_SIZE) {
                    const cell = gameState.gardenGrid[gridY][gridX];
                    if (!cell || cell.type !== 'obstacle') { // Check for obstacles
                        gnome.x = newX;
                        gnome.y = newY;
                    }
                }

                // Update gnome direction towards movement if not chasing
                if (!nearestPlayer) {
                    targetDirection = Math.atan2(dy, dx);
                }
            }
        }

        // Interpolate direction towards target direction using angle lerp
        const lerpFactor = 0.02; // Adjust this factor for smoother or faster transitions
        gnome.direction = lerpAngle(gnome.direction, targetDirection, lerpFactor);

        // Store path for rendering
        gnome.path = path;
    } else {
        gnome.path = [];
    }

    // Store detection range for rendering
    gnome.detectionRange = GNOME_DETECTION_RANGE;
}

// Function to render gnome
function renderGnome(ctx, gnome) {
    ctx.fillStyle = '#FF0000'; // Red color for gnomes
    ctx.beginPath();
    ctx.arc(gnome.x, gnome.y, TILE_SIZE / 3, 0, Math.PI * 2); // Draw a circle for the gnome
    ctx.fill();

    // Determine vision cone color based on gnome state
    const canSeePlayer = gameState.players.some(player => hasLineOfSight(gnome, player));
    let visionConeColor;
    if (canSeePlayer) {
        visionConeColor = 'rgba(255, 0, 0, 0.3)'; // Red if can see player
    } else if (gnome.lastKnownPosition) {
        visionConeColor = 'rgba(255, 255, 0, 0.3)'; // Yellow if moving to last known position
    } else {
        visionConeColor = 'rgba(0, 0, 255, 0.3)'; // Blue if patrolling
    }

    // Draw the vision cone
    const visionConeRadius = GNOME_DETECTION_RANGE; // Match the detection range
    const visionConeAngle = GNOME_VISION_CONE_ANGLE; // 35 degrees in radians
    ctx.strokeStyle = visionConeColor; // Set vision cone color

    const numRays = 100; // Number of rays to cast
    const angleIncrement = (visionConeAngle * 2) / numRays;

    for (let i = 0; i <= numRays; i++) {
        const rayAngle = gnome.direction - visionConeAngle + i * angleIncrement;
        let rayEndX = gnome.x + Math.cos(rayAngle) * visionConeRadius;
        let rayEndY = gnome.y + Math.sin(rayAngle) * visionConeRadius;

        // Check for obstacles along the ray
        const dx = rayEndX - gnome.x;
        const dy = rayEndY - gnome.y;
        const distance = Math.hypot(dx, dy);
        const steps = Math.ceil(distance / (TILE_SIZE / 4));
        const stepX = dx / steps;
        const stepY = dy / steps;

        for (let j = 1; j <= steps; j++) {
            const checkX = gnome.x + stepX * j;
            const checkY = gnome.y + stepY * j;
            const { gridX, gridY } = positionToGrid(checkX, checkY);

            if (gridX >= 0 && gridX < GARDEN_WIDTH / TILE_SIZE &&
                gridY >= 0 && gridY < GARDEN_HEIGHT / TILE_SIZE) {
                const cell = gameState.gardenGrid[gridY][gridX];
                if (cell && (cell.type === 'obstacle' || cell.type === 'hidingSpot')) {
                    rayEndX = checkX;
                    rayEndY = checkY;
                    break; // Stop the ray at the obstacle
                }
            }
        }

        // Draw the ray
        ctx.beginPath();
        ctx.moveTo(gnome.x, gnome.y);
        ctx.lineTo(rayEndX, rayEndY);
        ctx.stroke();
    }

    // Draw direction indicator
    const indicatorLength = TILE_SIZE / 4; // Adjusted length to be within the circle
    const indicatorX = gnome.x + Math.cos(gnome.direction) * indicatorLength;
    const indicatorY = gnome.y + Math.sin(gnome.direction) * indicatorLength;
    ctx.strokeStyle = '#FFFFFF'; // White color for the direction indicator
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gnome.x, gnome.y);
    ctx.lineTo(indicatorX, indicatorY);
    ctx.stroke();

    // Render debug information if debugMode is on
    if (gameState.debugMode) {
        // Render detection range for debugging
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(gnome.x, gnome.y, gnome.detectionRange, 0, Math.PI * 2);
        ctx.stroke();

        // Render path for debugging
        ctx.strokeStyle = '#FF0000'; // Red color for path
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gnome.x, gnome.y);
        gnome.path.forEach(step => {
            const { x, y } = gridToPosition(step.gridX, step.gridY);
            ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
}

// Simple hash function to convert a string to a numeric seed
function stringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash); // Ensure positive seed
}

function renderHidingSpot(ctx, hidingSpot) {
    const numCircles = 40; // Number of circles to render
    const radius = TILE_SIZE / 4; // Radius of each circle
    const baseColor = 'rgba(0, 128, 0, 0.5)'; // Semi-transparent green

    // Render a green cross as a fallback or debug representation
    ctx.strokeStyle = '#008000'; // Green color for the cross
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hidingSpot.x - TILE_SIZE / 4, hidingSpot.y);
    ctx.lineTo(hidingSpot.x + TILE_SIZE / 4, hidingSpot.y);
    ctx.moveTo(hidingSpot.x, hidingSpot.y - TILE_SIZE / 4);
    ctx.lineTo(hidingSpot.x, hidingSpot.y + TILE_SIZE / 4);
    ctx.stroke();

    // Use the cross as the primary rendering in debug mode
    if (gameState.debugMode) return;

    // Use the hiding spot's ID to deterministically generate positions
    const seed = stringToSeed(hidingSpot.id); // Convert ID to a numeric seed

    for (let i = 0; i < numCircles; i++) {
        const angle = seededRandom(seed + i) * 2 * Math.PI;
        const distance = seededRandom(seed + i + numCircles) * (TILE_SIZE / 1.5);
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;

        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(hidingSpot.x + offsetX, hidingSpot.y + offsetY, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Deterministic random function using a seed
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    const result = x - Math.floor(x);
    return result;
}

// Main game loop
function gameLoop() {
    updateGamepads(gameState);
    lobbyLogic(gameState);
    gameState.players.forEach(handlePlayerActions);
    gameState.entities.forEach(entity => {
        if (entity.type === 'gnome') {
            updateGnomePatrol(entity);
        }
    });
    logic();
    render();
}

// Main game logic
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

        // Apply speed boost multiplier if active
        let speedMultiplier = 1;
        if (player.hasSpeedBoost) {
            speedMultiplier = PLAYER_SPEED_BOOST_MULTIPLIER;
        }

        if (dx !== 0 && dy !== 0) {
            dx *= config.diagonalSpeed * speedMultiplier;
            dy *= config.diagonalSpeed * speedMultiplier;
        } else {
            dx *= config.playerSpeed * speedMultiplier;
            dy *= config.playerSpeed * speedMultiplier;
        }

        const newX = player.x + dx;
        const newY = player.y + dy;
        const { gridX, gridY } = positionToGrid(newX, newY);

        // Check for collision with obstacles and boundaries
        if (gridX >= 0 && gridX < GARDEN_WIDTH / TILE_SIZE &&
            gridY >= 0 && gridY < GARDEN_HEIGHT / TILE_SIZE) {
            const cell = gameState.gardenGrid[gridY][gridX];
            if (!cell || cell.type !== 'obstacle') {
                player.x = newX;
                player.y = newY;
            }
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

// Function to render plants
function renderPlants(ctx) {
    gameState.entities.forEach(entity => {
        if (entity.type === 'plant') {
            ctx.fillStyle = '#00FF00'; // Green color for plants
            ctx.beginPath();
            ctx.arc(entity.x, entity.y, TILE_SIZE / 4, 0, Math.PI * 2); // Draw a circle for the plant
            ctx.fill();
        }
    });
}

// Function to render legend
function renderLegend(ctx) {
    const legendX = 20;
    const legendY = canvas.height - 100;
    const lineHeight = 20;
    const circleRadius = 5;

    const plantTypes = [
        { type: 'common', color: '#00FF00', points: getPlantPoints('common') },
        { type: 'rare', color: '#0000FF', points: getPlantPoints('rare') },
        { type: 'exotic', color: '#FF00FF', points: getPlantPoints('exotic') }
    ];

    plantTypes.forEach((plant, index) => {
        ctx.fillStyle = plant.color;
        ctx.beginPath();
        ctx.arc(legendX, legendY + index * lineHeight, circleRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${plant.type}: ${plant.points} points`, legendX + 15, legendY + index * lineHeight + 5);
    });
}

// Main render function
function render() {
    ctx.save();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(300, 100);

    // Draw the border of the arena
    ctx.strokeStyle = '#000000'; // Black color for the border
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, GARDEN_WIDTH, GARDEN_HEIGHT);

    // Center the camera on the local player if playing online
    if (isOnline) {
        const localPlayer = gameState.players.find(p => p.id === socket.id);
        if (localPlayer) {
            const offsetX = canvas.width / 2 - localPlayer.x;
            const offsetY = canvas.height / 2 - localPlayer.y;
            ctx.translate(offsetX, offsetY);
        }
    }
    
    // sort entities by y position, and ensure plants are rendered above players
    gameState.entities.sort((a, b) => {
        if (a.type === 'obstacle' && b.type !== 'obstacle') return 1;
        if (b.type === 'obstacle' && a.type !== 'obstacle') return -1;
        if (a.type === 'plant' && b.type !== 'plant') return 1;
        if (b.type === 'plant' && a.type !== 'plant') return -1;
        if (a.type === 'hidingSpot' && b.type !== 'hidingSpot') return 1;
        if (b.type === 'hidingSpot' && a.type !== 'hidingSpot') return -1;
        return a.y - b.y;
    });

    gameState.entities.forEach((entity) => {
        switch (entity.type) {
            case 'player':
                renderPlayer(ctx, entity, entity.gamepad);
                
                // Render speed boost indicator
                if (entity.hasSpeedBoost) {
                    ctx.strokeStyle = '#00FF00'; // Green color for speed boost
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y, entity.width / 2 + 5, 0, Math.PI * 2);
                    ctx.stroke();
                }
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
            case 'plant':
                // Differentiate plant rendering based on rarity
                switch (entity.plantType) {
                    case 'common':
                        ctx.fillStyle = '#00FF00'; // Green for common
                        break;
                    case 'rare':
                        ctx.fillStyle = '#0000FF'; // Blue for rare
                        break;
                    case 'exotic':
                        ctx.fillStyle = '#FF00FF'; // Magenta for exotic
                        break;
                }
                ctx.beginPath();
                ctx.arc(entity.x, entity.y, TILE_SIZE / 4, 0, Math.PI * 2); // Draw a circle for the plant
                ctx.fill();

                // Render collection progress if a player is collecting
                const collectingPlayer = gameState.players.find(player => player.collecting && player.collecting.plant.id === entity.id);
                if (collectingPlayer) {
                    const progress = collectingPlayer.collecting.time / getCollectionTime(entity.plantType);
                    ctx.strokeStyle = '#000000'; // Black color for the collection progress
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y, TILE_SIZE / 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
                    ctx.stroke();
                }
                break;
            case 'gnome':
                renderGnome(ctx, entity);
                break;
            case 'obstacle':
                ctx.fillStyle = '#8B4513'; // Brown color for obstacles
                ctx.fillRect(entity.x - TILE_SIZE / 2, entity.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
                break;
            case 'hidingSpot':
                renderHidingSpot(ctx, entity);
                break;
            default:
                console.warn(`Unknown entity type: ${entity.type}`);
        }
    });

    ctx.restore();

    // Render UIs
    renderGameModeStatus();
    renderLobbyUI(gameState.players, gameState.lobby);

    // Render legend
    renderLegend(ctx);
}

// Function to create a player
function createPlayer(color, gamepadIndex) {
    const { gridX, gridY } = findEmptySpot();
    const { x, y } = gridToPosition(gridX, gridY);
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
        speedBoostTimer: 0,
        hasSpeedBoost: false
    };
    gameState.players.push(newPlayer);
    gameState.entities.push(newPlayer);
    return newPlayer;
}

// Function to add a new player
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

    // Track visibility duration
    if (!player.visibilityDuration) {
        player.visibilityDuration = 0;
    }

    // Initialize respawnTimer and respawnScheduled flag
    if (player.respawnTimer === undefined) {
        player.respawnTimer = 0;
    }
    if (player.respawnScheduled === undefined) {
        player.respawnScheduled = false;
    }

    // Update speed boost timer
    if (player.speedBoostTimer > 0) {
        player.speedBoostTimer -= 1 / 60; // Assuming 60 FPS
        if (player.speedBoostTimer <= 0) {
            player.hasSpeedBoost = false;
            player.speedBoostTimer = 0;
        }
    }

    // Check if player is visible to any gnome
    const isVisibleToGnomes = gameState.entities.some(entity => entity.type === 'gnome' && hasLineOfSight(entity, player));
    if (isVisibleToGnomes) {
        player.visibilityDuration += 1 / 60; // Assuming 60 FPS
    } else {
        player.visibilityDuration = 0;
        player.respawnScheduled = false; // Reset flag if not visible
    }

    // Schedule respawn if visible for more than the threshold
    if (player.visibilityDuration > PLAYER_VISIBILITY_THRESHOLD && !player.respawnScheduled) {
        player.visibilityDuration = 0;
        player.respawnScheduled = true; // Set flag to prevent multiple schedules
        player.respawnTimer = PLAYER_RESPAWN_TIME; // Set respawn timer
    }

    // Decrement respawn timer and respawn player if timer reaches zero
    if (player.respawnTimer > 0) {
        player.respawnTimer -= 1 / 60; // Assuming 60 FPS
        if (player.respawnTimer <= 0) {
            respawnPlayer(player);
            player.respawnScheduled = false; // Reset flag after respawn
        }
        return; // Prevent interaction while respawning
    }

    // Find the closest plant within range
    const nearbyPlants = gameState.entities.filter(entity => entity.type === 'plant' && isNear(player, entity));
    const closestPlant = nearbyPlants.reduce((closest, plant) => {
        const distance = Math.hypot(player.x - plant.x, player.y - plant.y);
        return (!closest || distance < closest.distance) ? { plant, distance } : closest;
    }, null);

    if (closestPlant && gamepad.A) {
        if (!player.collecting) {
            player.collecting = { plant: closestPlant.plant, time: 0 };
        }
        player.collecting.time += 1 / 60; // Assuming 60 FPS
        if (player.collecting.time >= getCollectionTime(closestPlant.plant.plantType)) {
            player.score += getPlantPoints(closestPlant.plant.plantType);
            gameState.entities = gameState.entities.filter(entity => entity.id !== closestPlant.plant.id);
            const { gridX, gridY } = positionToGrid(closestPlant.plant.x, closestPlant.plant.y);
            gameState.gardenGrid[gridY][gridX] = null;
            player.collecting = null;
            
            // Activate speed boost when plant is collected
            player.speedBoostTimer = PLAYER_SPEED_BOOST_DURATION;
            player.hasSpeedBoost = true;
        }
    } else {
        player.collecting = null;
    }

    if (gamepad.B) {
        // Implement other actions if needed
    }
}

// Function to respawn a player around the center of the map
function respawnPlayer(player) {
    const centerX = GARDEN_WIDTH / 2;
    const centerY = GARDEN_HEIGHT / 2;
    let validPositionFound = false;
    let newX, newY;

    let attempts = 0;
    while (!validPositionFound) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * TILE_SIZE * (2 + attempts / 10); // Random distance within a 2-tile radius
        newX = centerX + Math.cos(angle) * distance;
        newY = centerY + Math.sin(angle) * distance;
        const { gridX, gridY } = positionToGrid(newX, newY);

        if (gridX >= 0 && gridX < GARDEN_WIDTH / TILE_SIZE &&
            gridY >= 0 && gridY < GARDEN_HEIGHT / TILE_SIZE) {
            const cell = gameState.gardenGrid[gridY][gridX];
            if (!cell || cell.type !== 'obstacle') {
                validPositionFound = true;
            }
        }
        attempts++;
    }

    player.x = newX;
    player.y = newY;
    player.respawnTimer = 0; // Reset respawn timer
    player.respawnScheduled = false; // Reset respawn flag
    player.visibilityDuration = 0; // Reset visibility duration
}

// Helper function to get collection time for each plant type
function getCollectionTime(plantType) {
    switch (plantType) {
        case 'common': return 1; // 1 second
        case 'rare': return 2; // 2 seconds
        case 'exotic': return 3; // 3 seconds
        default: return 1;
    }
}

// Helper function to get points for each plant type
function getPlantPoints(plantType) {
    switch (plantType) {
        case 'common': return 10;
        case 'rare': return 25;
        case 'exotic': return 50;
        default: return 0;
    }
}

// Check if player is near an entity
function isNear(player, entity) {
    const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
    return distance < 50;
}

function roundStart() {
    // Spawn plants
    for (let i = 0; i < 4; i++) {
        placePlantRandomly('common');
        placePlantRandomly('rare');
        placePlantRandomly('exotic');
        placeHidingSpotRandomly();
    }

    // Spawn gnomes
    for (let i = 0; i < 4; i++) {
        createGnome();
    }
}

function roundEnd() {
    // Despawn all plants, gnomes, and hiding spots
    gameState.entities = gameState.entities.filter(entity => entity.type !== 'plant' && entity.type !== 'gnome' && entity.type !== 'hidingSpot');

    // Reset player properties related to plants
    gameState.players.forEach(player => {
        player.collecting = null;
    });
}

function gameReset() {
    // Reactivate all players
    gameState.players.forEach(player => {
        player.active = true;
    });

    // ... existing code ...
}