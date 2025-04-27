const COLOR_INACTIVE = '#ffffff';
const COLOR_BACKGROUND = '#ECECEC';

function renderInputDebugUI(ctx, gamepads, players) {
    ctx.save();

    let yPosition = canvas.height - config.pixelSize * 5 - 16;
    let xPosition = 16;

    gamepads.forEach((gamepad, index) => {
        const playerColor = players[index] ? players[index].color : '#000000';

        renderGamepad(ctx, gamepad, xPosition, yPosition, playerColor);

        xPosition += config.pixelSize * 9;
    });

    ctx.restore();
}

function renderGamepad(ctx, gamepad, xPosition, yPosition, playerColor) {
    // Draw the background
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(xPosition, yPosition, config.pixelSize * 8, config.pixelSize * 5);

    xPosition += config.pixelSize;
    yPosition += config.pixelSize;

    // Draw directional buttons in a cross pattern
    drawPixel(ctx, xPosition, yPosition + config.pixelSize, gamepad.left, playerColor);
    drawPixel(ctx, xPosition + config.pixelSize, yPosition, gamepad.up, playerColor);
    drawPixel(ctx, xPosition + config.pixelSize, yPosition + config.pixelSize, false, playerColor); // Center
    drawPixel(ctx, xPosition + config.pixelSize, yPosition + 2 * config.pixelSize, gamepad.down, playerColor);
    drawPixel(ctx, xPosition + 2 * config.pixelSize, yPosition + config.pixelSize, gamepad.right, playerColor);

    // Draw A and B buttons to the right
    drawPixel(ctx, xPosition + 4 * config.pixelSize, yPosition + 2 * config.pixelSize, gamepad.A, playerColor);
    drawPixel(ctx, xPosition + 5 * config.pixelSize, yPosition, gamepad.B, playerColor);
}

function drawPixel(ctx, x, y, active, color) {
    ctx.fillStyle = active ? color : COLOR_INACTIVE;
    ctx.fillRect(x, y, config.pixelSize, config.pixelSize);
} 