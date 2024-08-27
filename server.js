const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8081 });

// Game state
let gameState = {
    board: Array(5).fill(null).map(() => Array(5).fill(null)),
    turn: 'Player1',
    players: {
        "Player1": ["P1", "P2", "H1", "H2", "P3"],
        "Player2": ["P1", "P2", "H1", "H2", "P3"]
    },
    winner: null,
    current_player: null,
};

// Player1 is A and Player2 is B
const getPlayer = () => ({ "Player1": "A", "Player2": "B" });

// Initialize the board with players and their characters
const initializeBoard = (player) => {
    gameState.board[0] = ['A.P1', 'A.P2', 'A.H1', 'A.H2', 'A.P3']; // Player1's setup
    gameState.board[4] = ['B.P1', 'B.P2', 'B.H1', 'B.H2', 'B.P3']; // Player2's setup
    gameState.current_player = getPlayer()[player];
};

const mapDirection = (moves, currentPosition) => {
    const directionMapper = {};
    const [x1, y1] = currentPosition;

    moves.forEach(([x, y]) => {
        if (x === x1 && y === y1 - 1) directionMapper['L'] = [x, y];  // Left
        else if (x === x1 && y === y1 + 1) directionMapper['R'] = [x, y];  // Right
        else if (x === x1 + 1 && y === y1) directionMapper['F'] = [x, y];  // Forward
        else if (x === x1 - 1 && y === y1) directionMapper['B'] = [x, y];  // Backward
        else if (x === x1 - 1 && y === y1 + 2) directionMapper['FL'] = [x, y];  // Forward-Left
        else if (x === x1 + 1 && y === y1 + 2) directionMapper['FR'] = [x, y];  // Forward-Right
        else if (x === x1 - 1 && y === y1 - 2) directionMapper['BL'] = [x, y];  // Backward-Left
        else if (x === x1 + 1 && y === y1 - 2) directionMapper['BR'] = [x, y];  // Backward-Right
        else if (x === x1 + 2 && y === y1 + 1) directionMapper['RF'] = [x, y];  // Right-Forward
        else if (x === x1 + 2 && y === y1 - 1) directionMapper['RB'] = [x, y];  // Right-Backward
        else if (x === x1 - 2 && y === y1 + 1) directionMapper['LF'] = [x, y];  // Left-Forward
        else if (x === x1 - 2 && y === y1 - 1) directionMapper['LB'] = [x, y];  // Left-Backward
    });

    return directionMapper;
};

const getMovesWithinBounds = (moves) => 
    moves.filter(([x, y]) => x >= 0 && x < 5 && y >= 0 && y < 5);

const getPawnMoves = (x, y) => {
    const moves = [[x, y + 1], [x + 1, y], [x - 1, y], [x, y - 1]];
    return mapDirection(getMovesWithinBounds(moves), [x, y]);
};

const getHeroOneMoves = (x, y) => {
    const moves = [
        [x, y + 2], [x + 2, y], [x - 2, y], [x, y - 2]
    ];
    return mapDirection(getMovesWithinBounds(moves), [x, y]);
};

const getHeroTwoMoves = (x, y) => {
    const moves = [
        [x - 1, y + 2], [x + 1, y + 2], [x - 1, y - 2], 
        [x + 1, y - 2], [x + 2, y + 1], [x + 2, y - 1], 
        [x - 2, y + 1], [x - 2, y - 1]
    ];
    return mapDirection(getMovesWithinBounds(moves), [x, y]);
};

// Get valid moves based on the character and position
const getValidMoves = (character, position) => {
    const [x, y] = position;
    switch (character) {
        case 'P1':
        case 'P2':
            return getPawnMoves(x, y);
        case 'H1':
            return getHeroOneMoves(x, y);
        case 'H2':
            return getHeroTwoMoves(x, y);
        default:
            console.log('Invalid character:', character);
            return null;
    }
};

// Finding the position of a character on the board
const findCharacterPosition = (player, character) => {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const [currentPlayer, currentCharacter] = gameState.board[i][j]?.split('.') || [];
            if (player === currentPlayer && character === currentCharacter) {
                return [i, j];
            }
        }
    }
    return null;
};

// Find all friends and their positions
const findAllFriends = (player) => {
    const currentPlayer = getPlayer()[player];
    const friends = [];
    const friendPositions = [];

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const [currentPlayerOnBoard, character] = gameState.board[i][j]?.split('.') || [];
            if (currentPlayer === currentPlayerOnBoard) {
                friends.push(character);
                friendPositions.push([i, j]);
            }
        }
    }

    return { friends, friendPositions };
};

// Check if a move is valid and process it
const processMove = (player, move) => {
    const [character, direction] = move.split(':');
    const currentPosition = findCharacterPosition(getPlayer()[player], character);
    if (!currentPosition) return false;

    const validMoves = getValidMoves(character.split('.')[1], currentPosition);
    const newPosition = validMoves[direction];
    if (!newPosition) return false;

    const { friends, friendPositions } = findAllFriends(player);

    if (!friends.includes(character.split('.')[1])) return false;
    if (friendPositions.some(pos => pos[0] === newPosition[0] && pos[1] === newPosition[1])) return false;

    gameState.board[currentPosition[0]][currentPosition[1]] = null;
    gameState.board[newPosition[0]][newPosition[1]] = `${getPlayer()[player]}.${character.split('.')[1]}`;

    removeOpponentCharacter(player, newPosition[1]);
    return true;
};

// Searching for and removing the opponent's character
const removeOpponentCharacter = (player, y) => {
    const opponentPlayer = player === "Player1" ? "Player2" : "Player1";
    const currentPlayer = getPlayer()[opponentPlayer];

    for (let i = 0; i < 5; i++) {
        const [boardPlayer, boardCharacter] = gameState.board[i][y]?.split('.') || [];
        if (boardPlayer && boardPlayer !== currentPlayer) {
            gameState.players[opponentPlayer] = gameState.players[opponentPlayer].filter(char => char !== boardCharacter);
            gameState.board[i][y] = null;
            return `Removed opponent's ${boardCharacter}`;
        }
    }
    return "No Character has been removed";
};

// Check if the game is over and determine the winner
const checkWinner = () => {
    const opponent = gameState.turn === 'Player1' ? 'Player2' : 'Player1';
    const opponentRemaining = gameState.players[opponent].length;
    const currentRemaining = gameState.players[gameState.turn].length;

    if (opponentRemaining === 0) {
        gameState.winner = gameState.turn;
        return true;
    } else if (currentRemaining === 0) {
        gameState.winner = opponent;
        return true;
    }
    return false;
};

// Handle socket connections
server.on('connection', (socket) => {
    console.log('Player Connected:', socket.id);

    // Initialize board for new players
    initializeBoard(socket.id);

    // Send initial game state
    socket.send(JSON.stringify(gameState));

    // Handle move event
    socket.on('move', (move) => {
        if (processMove(socket.id, move)) {
            if (checkWinner()) {
                socket.send(JSON.stringify({ winner: gameState.winner }));
            } else {
                gameState.turn = gameState.turn === 'Player1' ? 'Player2' : 'Player1';
            }
        } else {
            socket.send(JSON.stringify({ error: 'Invalid move' }));
        }
    });

    // Handle disconnection
    socket.on('close', () => {
        console.log('Player Disconnected:', socket.id);
    });
});
