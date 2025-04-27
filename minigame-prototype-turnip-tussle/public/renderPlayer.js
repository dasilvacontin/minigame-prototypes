function renderPlayer(ctx, entity, gamepad) {
    // Draw the player centered at (entity.x, entity.y)
    ctx.fillStyle = entity.color;
    ctx.fillRect(
        entity.x - entity.width / 2,
        entity.y - entity.height / 2,
        entity.width,
        entity.height
    );

    // Draw water can meter
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(
        entity.x - entity.width / 2,
        entity.y - entity.height / 2 - 10, // Position above the player
        entity.waterCan / 2, // Scale the width based on water can level
        5
    );

    // Display seed type and quantity
    if (entity.seeds) {
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText(`${entity.seeds.type}: ${entity.seeds.quantity}`, entity.x, entity.y - entity.height / 2 - 20);
    }

    // Draw button feedback
    if (gamepad) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (gamepad.A) {
            ctx.fillText('A', entity.x, entity.y);
        }
        if (gamepad.B) {
            ctx.fillText('B', entity.x, entity.y);
        }

        // Draw the outline only if A or B is pressed
        if (gamepad.A || gamepad.B) {
            ctx.strokeStyle = entity.color;
            ctx.lineWidth = 4;
            const gap = 4; // Define the gap size
            ctx.strokeRect(
                entity.x - entity.width / 2 - gap,
                entity.y - entity.height / 2 - gap,
                entity.width + 2 * gap,
                entity.height + 2 * gap
            );
        }
    }

    ctx.fillStyle = '#7C7C7C';
    ctx.font = 'normal 12px Sk-Modernist';
    ctx.textAlign = 'center';
    // Draw username
    ctx.fillText(`${entity.username}`, entity.x, entity.y + entity.height / 2 + 20);
    // Draw the score
    ctx.fillText(`Score: ${entity.score || 0}`, entity.x, entity.y + entity.height / 2 + 40);

    // Draw debug gamepad
    if (gameState.debugMode) {
        ctx.save();
        ctx.translate(entity.x, entity.y + entity.height + 30);
        ctx.scale(0.25, 0.25);
        ctx.translate(-4 * 16, 0);
        renderGamepad(ctx, gamepad, 0, 0, entity.color);
        ctx.restore();
    }
} 