// Sudoku Game Logic

let sudokuState = {
    puzzle: [],
    solution: [],
    board: [],
    selectedCell: null,
    startTime: null
};

function initSudoku() {
    newSudokuGame();
}

function newSudokuGame() {
    const puzzleData = sudokuPuzzles[Math.floor(Math.random() * sudokuPuzzles.length)];
    
    sudokuState = {
        puzzle: JSON.parse(JSON.stringify(puzzleData.puzzle)),
        solution: JSON.parse(JSON.stringify(puzzleData.solution)),
        board: JSON.parse(JSON.stringify(puzzleData.puzzle)),
        selectedCell: null,
        startTime: Date.now()
    };
    
    createSudokuBoard();
    createNumberPad();
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

function selectSudokuCell(row, col) {
    // Don't select fixed cells
    if (sudokuState.puzzle[row][col] !== 0) return;
    
    // Clear previous selection
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Select new cell
    const cell = document.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('selected');
    sudokuState.selectedCell = { row, col };
}

function enterSudokuNumber(num) {
    if (!sudokuState.selectedCell) {
        return;
    }
    
    const { row, col } = sudokuState.selectedCell;
    
    // Don't modify fixed cells
    if (sudokuState.puzzle[row][col] !== 0) return;
    
    sudokuState.board[row][col] = num;
    const cell = document.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = num;
    
    // Check if correct
    if (num === sudokuState.solution[row][col]) {
        cell.classList.remove('error');
        checkSudokuComplete();
    } else {
        cell.classList.add('error');
    }
}

function clearSudokuCell() {
    if (!sudokuState.selectedCell) return;
    
    const { row, col } = sudokuState.selectedCell;
    
    // Don't clear fixed cells
    if (sudokuState.puzzle[row][col] !== 0) return;
    
    sudokuState.board[row][col] = 0;
    const cell = document.querySelector(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = '';
    cell.classList.remove('error');
}

function checkSudokuComplete() {
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
        setTimeout(() => {
            alert('🎉 Congratulations! You solved the Sudoku puzzle!');
            if (window.recordScore) {
                const durationSeconds = Math.round((Date.now() - sudokuState.startTime) / 1000);
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
