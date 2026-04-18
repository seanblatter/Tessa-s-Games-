// Sudoku Game Logic

const SUDOKU_MIN_VISIBLE_CIRCLES = 10;

let sudokuState = {
    puzzle: [],
    solution: [],
    board: [],
    selectedCell: null,
    startTime: null,
    autoCheck: true,
    puzzleIndex: 0,
    gameNumber: 1,
    completed: false,
    allowReplay: false,
    loaded: false,
    progress: {
        solvedGames: {}
    }
};

async function initSudoku() {
    setupAutoCheckToggle();
    await loadSudokuProgress();
    await openSudokuGame(getDefaultSudokuGameNumber(), false);
}

function getDefaultSudokuGameNumber() {
    const solvedNumbers = Object.keys(sudokuState.progress.solvedGames || {}).map((value) => Number(value));
    let next = 1;
    while (solvedNumbers.includes(next)) {
        next += 1;
    }
    return next;
}

async function loadSudokuProgress() {
    sudokuState.progress = { solvedGames: {} };
    const firebase = window.firebaseServices;
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!firebase || !user) {
        renderSudokuCircles();
        return;
    }

    try {
        const progressRef = firebase.doc(firebase.db, 'users', user.uid, 'sudokuProgress', 'main');
        const snap = await firebase.getDoc(progressRef);
        if (snap.exists()) {
            const data = snap.data() || {};
            sudokuState.progress = {
                solvedGames: data.solvedGames || {}
            };
        }
    } catch (error) {
        // Ignore and continue with local empty state.
    }

    renderSudokuCircles();
}

async function saveSudokuProgress() {
    const firebase = window.firebaseServices;
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!firebase || !user) return;

    const progressRef = firebase.doc(firebase.db, 'users', user.uid, 'sudokuProgress', 'main');
    await firebase.setDoc(progressRef, {
        solvedGames: sudokuState.progress.solvedGames,
        updatedAt: firebase.serverTimestamp()
    }, { merge: true });
}

function getPuzzleIndexByGameNumber(gameNumber) {
    return (gameNumber - 1) % sudokuPuzzles.length;
}

function getGameLabel() {
    const solved = sudokuState.progress.solvedGames[sudokuState.gameNumber];
    if (!solved) return `Game ${sudokuState.gameNumber}`;
    return `Game ${sudokuState.gameNumber} · Solved in ${formatDurationSeconds(solved.durationSeconds || 0)}`;
}

function formatDurationSeconds(seconds) {
    const safe = Number(seconds) || 0;
    const minutes = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function openSudokuGame(gameNumber, allowReplay = true) {
    const autoCheck = getAutoCheckValue();
    const puzzleIndex = getPuzzleIndexByGameNumber(gameNumber);
    const puzzleData = sudokuPuzzles[puzzleIndex];
    const solved = sudokuState.progress.solvedGames[gameNumber];

    sudokuState = {
        ...sudokuState,
        puzzle: JSON.parse(JSON.stringify(puzzleData.puzzle)),
        solution: JSON.parse(JSON.stringify(puzzleData.solution)),
        board: JSON.parse(JSON.stringify(puzzleData.puzzle)),
        selectedCell: null,
        startTime: Date.now(),
        autoCheck,
        puzzleIndex,
        gameNumber,
        completed: Boolean(solved),
        allowReplay,
        loaded: true
    };

    if (solved) {
        sudokuState.board = JSON.parse(JSON.stringify(puzzleData.solution));
    }

    createSudokuBoard();
    createNumberPad();
    applyAutoCheckToBoard();
    renderSudokuFooter();
    renderSudokuCircles();
    clearMessage('sudoku');
    if (solved) {
        showMessage('sudoku', 'This game is already solved. Tap its circle to replay it.', 'info');
    }
}

async function newSudokuGame() {
    if (window.canPlayDailyGame && !(await window.canPlayDailyGame('sudoku'))) {
        return;
    }

    const nextGame = getDefaultSudokuGameNumber();
    await openSudokuGame(nextGame, true);
}

function setupAutoCheckToggle() {
    const toggle = document.getElementById('sudoku-autocheck');
    if (!toggle || toggle.dataset.ready) return;
    toggle.dataset.ready = 'true';
    toggle.addEventListener('change', () => {
        sudokuState.autoCheck = toggle.checked;
        applyAutoCheckToBoard();
    });
}

function getAutoCheckValue() {
    const toggle = document.getElementById('sudoku-autocheck');
    return toggle ? toggle.checked : true;
}

function applyAutoCheckToBoard() {
    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach((cell) => {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        const value = sudokuState.board[row]?.[col] || 0;
        if (!value) {
            cell.classList.remove('error');
            return;
        }
        if (sudokuState.autoCheck && value !== sudokuState.solution[row][col]) {
            cell.classList.add('error');
        } else {
            cell.classList.remove('error');
        }
    });
}

function createSudokuBoard() {
    const board = document.getElementById('sudoku-board');
    board.innerHTML = '';

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const value = sudokuState.board[row][col];
            if (value !== 0) {
                cell.textContent = value;
                if (sudokuState.puzzle[row][col] !== 0) {
                    cell.classList.add('fixed');
                }
            }

            cell.onclick = () => selectSudokuCell(row, col);
            board.appendChild(cell);
        }
    }
}

function createNumberPad() {
    const pad = document.getElementById('number-pad');
    pad.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
        const button = document.createElement('button');
        button.className = 'number-button';
        button.textContent = i;
        button.onclick = () => enterSudokuNumber(i);
        pad.appendChild(button);
    }
}

function renderSudokuFooter() {
    const gameNumberEl = document.getElementById('sudoku-game-number');
    const gameStatusEl = document.getElementById('sudoku-game-status');
    if (!gameNumberEl || !gameStatusEl) return;

    gameNumberEl.textContent = `#${sudokuState.gameNumber}`;
    gameStatusEl.textContent = getGameLabel();
}

function renderSudokuCircles() {
    const container = document.getElementById('sudoku-history-circles');
    if (!container) return;

    const solvedGames = sudokuState.progress.solvedGames || {};
    const solvedNumbers = Object.keys(solvedGames).map((value) => Number(value)).sort((a, b) => a - b);
    const maxSolved = solvedNumbers.length ? solvedNumbers[solvedNumbers.length - 1] : 0;
    const totalCircles = Math.max(SUDOKU_MIN_VISIBLE_CIRCLES, maxSolved);

    container.innerHTML = '';

    for (let game = 1; game <= totalCircles; game++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sudoku-circle';
        if (solvedGames[game]) {
            button.classList.add('solved');
        }
        if (game === sudokuState.gameNumber) {
            button.classList.add('active');
        }
        button.textContent = String(game);
        button.title = solvedGames[game] ? `Replay game ${game}` : `Open game ${game}`;
        button.onclick = async () => {
            await openSudokuGame(game, true);
            if (solvedGames[game]) {
                showMessage('sudoku', `Replay mode: game ${game}.`, 'info');
            }
        };
        container.appendChild(button);
    }
}

function selectSudokuCell(row, col) {
    if (sudokuState.completed && !sudokuState.allowReplay) return;

    if (sudokuState.puzzle[row][col] !== 0) return;

    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        cell.classList.remove('selected');
    });

    const cell = document.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('selected');
    sudokuState.selectedCell = { row, col };
}

function enterSudokuNumber(num) {
    if (!sudokuState.selectedCell) {
        return;
    }

    if (sudokuState.completed && !sudokuState.allowReplay) {
        showMessage('sudoku', 'This game is already solved. Tap any circle to replay a game.', 'info');
        return;
    }

    const { row, col } = sudokuState.selectedCell;

    if (sudokuState.puzzle[row][col] !== 0) return;

    sudokuState.board[row][col] = num;
    const cell = document.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = num;

    if (sudokuState.autoCheck) {
        if (num === sudokuState.solution[row][col]) {
            cell.classList.remove('error');
            checkSudokuComplete();
        } else {
            cell.classList.add('error');
        }
    } else {
        cell.classList.remove('error');
        checkSudokuComplete();
    }
}

function clearSudokuCell() {
    if (!sudokuState.selectedCell) return;

    if (sudokuState.completed && !sudokuState.allowReplay) {
        showMessage('sudoku', 'This game is already solved. Tap any circle to replay a game.', 'info');
        return;
    }

    const { row, col } = sudokuState.selectedCell;

    if (sudokuState.puzzle[row][col] !== 0) return;

    sudokuState.board[row][col] = 0;
    const cell = document.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = '';
    cell.classList.remove('error');
}

async function checkSudokuComplete() {
    let complete = true;
    let correct = true;

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (sudokuState.board[row][col] === 0) {
                complete = false;
            } else if (sudokuState.board[row][col] !== sudokuState.solution[row][col]) {
                correct = false;
            }
        }
    }

    if (complete && correct) {
        sudokuState.completed = true;
        sudokuState.allowReplay = false;
        const durationSeconds = Math.round((Date.now() - sudokuState.startTime) / 1000);
        sudokuState.progress.solvedGames[sudokuState.gameNumber] = {
            completedAt: new Date().toISOString(),
            durationSeconds,
            puzzleIndex: sudokuState.puzzleIndex
        };

        await saveSudokuProgress();

        setTimeout(() => {
            showMessage('sudoku', `🎉 Solved game #${sudokuState.gameNumber}! Tap a circle to replay any game.`, 'success');
            renderSudokuFooter();
            renderSudokuCircles();
            if (window.recordScore) {
                window.recordScore('sudoku', { durationSeconds });
            }
        }, 100);
    }
}

// Keyboard support for Sudoku
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('sudoku-screen').classList.contains('active')) return;
    if (!sudokuState.selectedCell) return;

    if (e.key >= '1' && e.key <= '9') {
        enterSudokuNumber(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        clearSudokuCell();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
               e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        navigateSudoku(e.key);
    }
});

function navigateSudoku(key) {
    if (!sudokuState.selectedCell) return;

    let { row, col } = sudokuState.selectedCell;

    switch (key) {
        case 'ArrowUp':
            row = Math.max(0, row - 1);
            break;
        case 'ArrowDown':
            row = Math.min(8, row + 1);
            break;
        case 'ArrowLeft':
            col = Math.max(0, col - 1);
            break;
        case 'ArrowRight':
            col = Math.min(8, col + 1);
            break;
    }

    selectSudokuCell(row, col);
}
