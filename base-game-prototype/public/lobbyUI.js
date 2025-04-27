function renderLobbyUI(players, lobby) {
    const lobbyDiv = document.getElementById('lobbyUI');
    let htmlContent = '';

    // Determine the title based on the lobby state
    let title;
    let subtitle;
    switch (lobby.state) {
        case LobbyState.WAITING_FOR_PLAYERS:
            title = 'Contest';
            subtitle = 'Waiting for players...';
            break;
        case LobbyState.COUNTDOWN_TO_START:
            title = 'Contest';
            subtitle = 'Game starting in';
            break;
        case LobbyState.GAME_ACTIVE:
            title = 'Contest'
            subtitle = 'Time left: ';
            break;
        case LobbyState.GAME_OVER:
            title = 'Contest';
            break;
    }

    htmlContent += `<h3 style="font-weight: bold; margin: 0; color: #2E2E2E;">${title}</h3>`;

    // Sort lobby players by score
    lobby.players.sort((a, b) => b.score - a.score);

    // Draw player names and scores
    htmlContent += '<ul style="list-style: none; padding: 0;">';
    lobby.players.forEach((player) => {
        const playerName = isOnline ? player.username : `Player ${players.indexOf(player) + 1}`;
        htmlContent += `
            <li style="display: flex; justify-content: space-between; align-items: center; margin: 5px 0; color: #595959;">
                <span style="display: flex; align-items: center;">
                    <span style="display: inline-block; width: 10px; height: 10px; background-color: ${player.color}; margin-right: 8px;"></span>
                    ${playerName}
                </span>
                <span>${player.score}</span>
            </li>`;
    });
    htmlContent += '</ul>';

    // Draw countdown or winner
    if (lobby.state === LobbyState.COUNTDOWN_TO_START || lobby.state === LobbyState.GAME_ACTIVE) {
        htmlContent += `<p style="margin: 0; color: #595959;">${subtitle} ${Math.ceil(lobby.countdown)}</p>`;
    } else if (lobby.state === LobbyState.GAME_OVER && lobby.winner) {
        htmlContent += `<p style="margin: 0; color: #595959;">Winner: ${lobby.winner.username}</p>`;
    } else {
        htmlContent += `<p style="margin: 0; color: #595959;">${subtitle}</p>`;
    }

    lobbyDiv.innerHTML = htmlContent;
} 