// Setup canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const gui = new dat.GUI();

// Toggle debug mode with '*'
window.addEventListener('keydown', (e) => {
    if (e.key === '*') {
        gameState.debugMode = !gameState.debugMode;
    }
});

function generateUniqueId() {
    return Math.random().toString(36).slice(2, 11);
}

function getRandomColor() {
    const colors = ['#38C3FF', '#FFD738', '#FF3838', '#9BE993'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Define a constant for player speed
const config = {
    playerSpeed: 2,
    spawnRadius: 200, // Smaller initial value for closer spawn
    pixelSize: 16,
    diagonalSpeed: 2 / Math.sqrt(2),
    plotSpotSize: 100,
    plotSpots: 4,
};
gui.add(config, 'playerSpeed', 0, 10).name('Player Speed').onChange(updateSpeeds);
gui.add(config, 'spawnRadius', 0, 300).name('Spawn Radius');
gui.add(config, 'pixelSize', 5, 50).name('Pixel Size');
function updateSpeeds() {
    config.diagonalSpeed = config.playerSpeed / Math.sqrt(2);
}
