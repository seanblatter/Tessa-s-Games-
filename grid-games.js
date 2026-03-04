// 9x9 Grid game logic

const GRID_SIZE = 9;

const gridGameConfig = {
    pixel: {
        title: 'Pixel Patterns',
        targets: pixelPatterns9x9,
        clickMode: 'single',
        messageId: 'pixel-message',
        boardId: 'pixel-board'
    },
    lights: {
        title: 'Lights Out 9x9',
        targets: lightsOutTargets9x9,
        clickMode: 'cross',
        messageId: 'lights-message',
        boardId: 'lights-board'
    },
    mirror: {
        title: 'Mirror Mosaic',
        targets: mirrorMosaicTargets9x9,
        clickMode: 'mirror',
        messageId: 'mirror-message',
        boardId: 'mirror-board'
    }
};

const gridGameState = {
    pixel: null,
    lights: null,
    mirror: null
};

function empty9x9() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
}

function parsePattern(patternRows) {
    return patternRows.map((row) => row.split('').map((cell) => cell === '#'));
}

function cloneBoard(board) {
    return board.map((row) => row.slice());
}

function createScrambledBoard(target) {
    const board = empty9x9();
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if ((row + col) % 2 === 0 && target[row][col]) {
                board[row][col] = true;
            }
        }
    }
    return board;
}

function initGridGame(gameKey) {
    newGridGame(gameKey);
}

function newGridGame(gameKey) {
    if (window.canPlayDailyGame && !window.canPlayDailyGame(gameKey)) {
        return;
    }

    const config = gridGameConfig[gameKey];
    const target = parsePattern(config.targets[Math.floor(Math.random() * config.targets.length)]);
    const startingBoard = gameKey === 'lights' ? createScrambledBoard(target) : empty9x9();

    gridGameState[gameKey] = {
        target,
        board: startingBoard,
        gameOver: false,
        startTime: Date.now()
    };

    renderGridGame(gameKey);
    clearMessage(gameKey);
}

function renderGridGame(gameKey) {
    const config = gridGameConfig[gameKey];
    const state = gridGameState[gameKey];
    const boardEl = document.getElementById(config.boardId);
    boardEl.innerHTML = '';
    boardEl.classList.add('nine-grid-board');

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = `nine-grid-cell ${state.board[row][col] ? 'on' : ''}`;
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.onclick = () => handleGridClick(gameKey, row, col);
            boardEl.appendChild(cell);
        }
    }
}

function handleGridClick(gameKey, row, col) {
    const state = gridGameState[gameKey];
    if (!state || state.gameOver) return;

    if (gameKey === 'pixel') {
        toggleCell(state.board, row, col);
    } else if (gameKey === 'lights') {
        toggleCross(state.board, row, col);
    } else if (gameKey === 'mirror') {
        toggleCell(state.board, row, col);
        const mirrorCol = GRID_SIZE - 1 - col;
        if (mirrorCol !== col) {
            toggleCell(state.board, row, mirrorCol);
        }
    }

    renderGridGame(gameKey);
    checkGridWin(gameKey);
}

function toggleCell(board, row, col) {
    if (row < 0 || col < 0 || row >= GRID_SIZE || col >= GRID_SIZE) return;
    board[row][col] = !board[row][col];
}

function toggleCross(board, row, col) {
    toggleCell(board, row, col);
    toggleCell(board, row + 1, col);
    toggleCell(board, row - 1, col);
    toggleCell(board, row, col + 1);
    toggleCell(board, row, col - 1);
}

function boardsMatch(a, b) {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (a[row][col] !== b[row][col]) return false;
        }
    }
    return true;
}

function checkGridWin(gameKey) {
    const state = gridGameState[gameKey];
    if (!boardsMatch(state.board, state.target)) return;

    state.gameOver = true;
    const durationSeconds = Math.round((Date.now() - state.startTime) / 1000);
    showMessage(gameKey, `🎉 ${gridGameConfig[gameKey].title} solved!`, 'success');
    if (window.recordScore) {
        window.recordScore(gameKey, { durationSeconds });
    }
}

function showTargetPreview(gameKey) {
    const state = gridGameState[gameKey];
    if (!state) return;

    const preview = cloneBoard(state.board);
    state.board = cloneBoard(state.target);
    renderGridGame(gameKey);
    state.board = preview;

    setTimeout(() => {
        renderGridGame(gameKey);
    }, 800);
}

function initPixelGame() { initGridGame('pixel'); }
function initLightsGame() { initGridGame('lights'); }
function initMirrorGame() { initGridGame('mirror'); }

function newPixelGame() { newGridGame('pixel'); }
function newLightsGame() { newGridGame('lights'); }
function newMirrorGame() { newGridGame('mirror'); }
