const socket = new WebSocket('ws://localhost:8080');

const boardElement = document.getElementById('board');
const messageElement = document.getElementById('message');

// Create the game board UI
function createBoard(board) {
    boardElement.innerHTML = ''; // Clear the board

    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.position = `${i},${j}`;
            cell.textContent = board[i][j] ? board[i][j] : '';
            cell.addEventListener('click', () => handleMove(i, j));
            boardElement.appendChild(cell);
        }
    }
}

// Handle move when a cell is clicked
function handleMove(x, y) {
    const selectedCharacter = prompt('Enter your move (e.g., P1:L):');
    socket.send(JSON.stringify({ position: [x, y], move: selectedCharacter }));
}

// Update the board and messages based on the server response
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.board) {
        createBoard(data.board);
    }

    if (data.winner) {
        messageElement.textContent = `Winner is ${data.winner}`;
    } else if (data.error) {
        alert(data.error);
    } else {
        messageElement.textContent = `It's ${data.turn}'s turn!`;
    }
};

// Initial setup
socket.onopen = () => {
    console.log('Connected to the game server');
    messageElement.textContent = 'Waiting for another player...';
};

socket.onclose = () => {
    console.log('Disconnected from the game server');
    messageElement.textContent = 'Connection closed. Please refresh the page to start a new game.';
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    messageElement.textContent = 'An error occurred. Please try again.';
};
