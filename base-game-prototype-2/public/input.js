// Input handling
const keyboardState = {
    up: false,
    down: false,
    left: false,
    right: false,
    A: false,
    B: false
};

window.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'ArrowUp': keyboardState.up = true; break;
        case 'ArrowDown': keyboardState.down = true; break;
        case 'ArrowLeft': keyboardState.left = true; break;
        case 'ArrowRight': keyboardState.right = true; break;
        case 'KeyA': keyboardState.A = true; break;
        case 'KeyB': keyboardState.B = true; break;
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'ArrowUp': keyboardState.up = false; break;
        case 'ArrowDown': keyboardState.down = false; break;
        case 'ArrowLeft': keyboardState.left = false; break;
        case 'ArrowRight': keyboardState.right = false; break;
        case 'KeyA': keyboardState.A = false; break;
        case 'KeyB': keyboardState.B = false; break;
    }
});

// Gamepad handling
function updateGamepads(gameState) {
    const gamepads = Array.from(navigator.getGamepads());
    while (gamepads.length > 0 && gamepads[gamepads.length - 1] === null) {
        gamepads.pop();
    }
    gameState.gamepads = [keyboardState]; // Start with keyboard as first "gamepad"

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp) {
            const gamepadState = {
                up: gp.axes[1] < -0.5,
                down: gp.axes[1] > 0.5,
                left: gp.axes[0] < -0.5,
                right: gp.axes[0] > 0.5,
                A: gp.buttons[0].pressed,
                B: gp.buttons[1].pressed
            };
            gameState.gamepads.push(gamepadState);
        }
    }

    // Update the gamepad state for the local player in online mode
    if (isOnline) {
        const localPlayer = gameState.players.find(p => p.id === socket.id);
        if (localPlayer) {
            localPlayer.gamepad = gameState.gamepads[0]; // Use the first gamepad (keyboard)
        }
    } else {
        // In local mode, assign gamepads to players
        // Ensure each gamepad has an associated player and store gamepad state in player
        gameState.gamepads.forEach((gp, index) => {
            let player = gameState.players.find(player => player.gamepadIndex === index);
            if (!player) {
                player = createPlayer(
                    playerColors[index % playerColors.length],
                    index
                );
                player.username = `Player ${index + 1}`; // Assign default username
            }
            player.gamepad = gp; // Store the gamepad state in the player
        });
    }
} 