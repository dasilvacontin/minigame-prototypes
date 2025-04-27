const LobbyState = {
    WAITING_FOR_PLAYERS: 'waiting_for_players',
    COUNTDOWN_TO_START: 'countdown_to_start',
    GAME_ACTIVE: 'game_active',
    GAME_OVER: 'game_over'
};

function lobbyLogic(gameState) {
    const lobby = gameState.lobby;
    const sign = gameState.entities.find(entity => entity.type === 'sign');

    const handlePlayerJoining = () => {
        gameState.players.forEach((player) => {
            if (player.type === 'player' && !lobby.players.some(p => p.id === player.id)) {
                const gamepad = player.gamepad
                if (interactWithSign(player, sign, gamepad)) {
                    lobby.players.push(player);
                    lobby.countdown = 5; // Reset countdown to 5 seconds
                }
            }
        });
    };

    switch (lobby.state) {
        case LobbyState.WAITING_FOR_PLAYERS:
            handlePlayerJoining();
            if (lobby.players.length > 1 || gameState.debugMode && lobby.players.length > 0) {
                lobby.state = LobbyState.COUNTDOWN_TO_START;
            }
            break;

        case LobbyState.COUNTDOWN_TO_START:
            handlePlayerJoining();
            lobby.countdown -= 1 / 60; // Assuming 60 FPS
            if (lobby.countdown <= 0) {
                lobby.state = LobbyState.GAME_ACTIVE;
                lobby.countdown = lobby.gameDuration;

                // Spawn 50 coins randomly
                for (let i = 0; i < 50; i++) {
                    const coin = createCoin();
                    gameState.entities.push(coin);
                }
            }
            break;

        case LobbyState.GAME_ACTIVE:
            lobby.countdown -= 1 / 60;
            if (lobby.countdown <= 0) {
                lobby.state = LobbyState.GAME_OVER;
                lobby.countdown = 10; // 10 seconds before reset
                determineWinner(lobby);
            }
            break;

        case LobbyState.GAME_OVER:
            // Remove all coins
            gameState.entities = gameState.entities.filter(entity => entity.type !== 'coin');
            lobby.countdown -= 1 / 60;
            if (lobby.countdown <= 0) {
                resetLobby(lobby);
            }
            break;
    }
}

function interactWithSign(player, sign, gamepad) {
    const distance = Math.hypot(player.x - sign.x, player.y - sign.y);
    const closeEnough = distance < 50; // Define proximity threshold
    let interacted = closeEnough && gamepad.A; // Check if A button is pressed
    if (interacted) {
        console.log('Player interacted with sign');
    }
    return interacted;
}

function determineWinner(lobby) {
    lobby.winner = lobby.players.reduce((prev, current) => {
        if (prev === null || current.score > prev.score) {
            return current;
        } else {
            return prev;
        }
    }, null);
}

function resetLobby(lobby) {
    lobby.state = LobbyState.WAITING_FOR_PLAYERS;
    lobby.players.forEach(player => player.score = 0); // Reset scores
    lobby.players = [];
    lobby.winner = null;
}