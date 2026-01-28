// Crossword Game Logic

let crosswordState = {
    puzzle: null,
    board: [],
    selectedCell: null,
    direction: 'across',
    currentClue: null
};

function initCrossword() {
    newCrosswordGame();
}

function newCrosswordGame() {
    const puzzle = crosswordPuzzles[Math.floor(Math.random() * crosswordPuzzles.length)];
    
    crosswordState = {
        puzzle: puzzle,
        board: puzzle.grid.map(row => row.map(cell => cell === '#' ? '#' : '')),
        selectedCell: null,
        direction: 'across',
        currentClue: null
    };
    
    createCrosswordBoard();
    createCrosswordClues();
}

function createCrosswordBoard() {
    const board = document.getElementById('crossword-board');
    board.innerHTML = '';
    
    const rows = crosswordState.puzzle.grid.length;
    const cols = crosswordState.puzzle.grid[0].length;
    
    board.style.gridTemplateColumns = `repeat(${cols}, 35px)`;
    
    // Create number map
    const numberMap = {};
    [...crosswordState.puzzle.clues.across, ...crosswordState.puzzle.clues.down].forEach(clue => {
        const key = `${clue.row}-${clue.col}`;
        if (!numberMap[key]) {
            numberMap[key] = clue.number;
        }
    });
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'crossword-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if (crosswordState.puzzle.grid[row][col] === '#') {
                cell.classList.add('black');
            } else {
                const key = `${row}-${col}`;
                if (numberMap[key]) {
                    const number = document.createElement('span');
                    number.className = 'cell-number';
                    number.textContent = numberMap[key];
                    cell.appendChild(number);
                }
                
                const input = document.createElement('input');
                input.className = 'crossword-input';
                input.type = 'text';
                input.maxLength = 1;
                input.value = crosswordState.board[row][col];
                
                input.addEventListener('focus', () => selectCrosswordCell(row, col));
                input.addEventListener('input', (e) => handleCrosswordInput(row, col, e));
                input.addEventListener('keydown', (e) => handleCrosswordKeydown(row, col, e));
                
                cell.appendChild(input);
            }
            
            board.appendChild(cell);
        }
    }
}

function createCrosswordClues() {
    const acrossDiv = document.getElementById('across-clues');
    const downDiv = document.getElementById('down-clues');
    
    acrossDiv.innerHTML = '';
    downDiv.innerHTML = '';
    
    crosswordState.puzzle.clues.across.forEach(clue => {
        const clueItem = document.createElement('div');
        clueItem.className = 'clue-item';
        clueItem.textContent = `${clue.number}. ${clue.clue}`;
        clueItem.onclick = () => selectClue('across', clue);
        acrossDiv.appendChild(clueItem);
    });
    
    crosswordState.puzzle.clues.down.forEach(clue => {
        const clueItem = document.createElement('div');
        clueItem.className = 'clue-item';
        clueItem.textContent = `${clue.number}. ${clue.clue}`;
        clueItem.onclick = () => selectClue('down', clue);
        downDiv.appendChild(clueItem);
    });
}

function selectCrosswordCell(row, col) {
    crosswordState.selectedCell = { row, col };
    
    // Clear previous highlights
    document.querySelectorAll('.crossword-cell').forEach(cell => {
        cell.classList.remove('selected', 'highlight');
    });
    
    // Highlight selected cell
    const cell = document.querySelector(`.crossword-cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.add('selected');
    }
    
    // Find and highlight current word
    highlightCurrentWord(row, col);
}

function selectClue(direction, clue) {
    crosswordState.direction = direction;
    crosswordState.currentClue = clue;
    
    // Update clue highlighting
    document.querySelectorAll('.clue-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Focus first cell of the word
    const firstCell = document.querySelector(
        `.crossword-cell[data-row="${clue.row}"][data-col="${clue.col}"] input`
    );
    if (firstCell) {
        firstCell.focus();
    }
}

function highlightCurrentWord(row, col) {
    // Clear previous highlights
    document.querySelectorAll('.crossword-cell').forEach(cell => {
        cell.classList.remove('highlight');
    });
    
    // Find which word this cell belongs to
    const allClues = [...crosswordState.puzzle.clues.across, ...crosswordState.puzzle.clues.down];
    
    for (const clue of allClues) {
        const direction = crosswordState.puzzle.clues.across.includes(clue) ? 'across' : 'down';
        const isInWord = isInClueWord(row, col, clue, direction);
        
        if (isInWord) {
            // Highlight the entire word
            for (let i = 0; i < clue.length; i++) {
                const r = direction === 'across' ? clue.row : clue.row + i;
                const c = direction === 'across' ? clue.col + i : clue.col;
                const cell = document.querySelector(`.crossword-cell[data-row="${r}"][data-col="${c}"]`);
                if (cell && !cell.classList.contains('selected')) {
                    cell.classList.add('highlight');
                }
            }
            break;
        }
    }
}

function isInClueWord(row, col, clue, direction) {
    if (direction === 'across') {
        return row === clue.row && col >= clue.col && col < clue.col + clue.length;
    } else {
        return col === clue.col && row >= clue.row && row < clue.row + clue.length;
    }
}

function handleCrosswordInput(row, col, event) {
    const value = event.target.value.toUpperCase();
    crosswordState.board[row][col] = value;
    event.target.value = value;
    
    if (value) {
        // Move to next cell
        moveToNextCell(row, col);
        checkCrosswordComplete();
    }
}

function handleCrosswordKeydown(row, col, event) {
    if (event.key === 'Backspace' && !event.target.value) {
        event.preventDefault();
        moveToPreviousCell(row, col);
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveToPreviousCell(row, col);
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveToNextCell(row, col);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveVertical(row, col, -1);
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveVertical(row, col, 1);
    }
}

function moveToNextCell(row, col) {
    const cols = crosswordState.puzzle.grid[0].length;
    const rows = crosswordState.puzzle.grid.length;
    
    let nextRow = row;
    let nextCol = col + 1;
    
    while (nextRow < rows) {
        while (nextCol < cols) {
            if (crosswordState.puzzle.grid[nextRow][nextCol] !== '#') {
                const input = document.querySelector(
                    `.crossword-cell[data-row="${nextRow}"][data-col="${nextCol}"] input`
                );
                if (input) {
                    input.focus();
                    return;
                }
            }
            nextCol++;
        }
        nextRow++;
        nextCol = 0;
    }
}

function moveToPreviousCell(row, col) {
    let prevRow = row;
    let prevCol = col - 1;
    
    while (prevRow >= 0) {
        while (prevCol >= 0) {
            if (crosswordState.puzzle.grid[prevRow][prevCol] !== '#') {
                const input = document.querySelector(
                    `.crossword-cell[data-row="${prevRow}"][data-col="${prevCol}"] input`
                );
                if (input) {
                    input.focus();
                    return;
                }
            }
            prevCol--;
        }
        prevRow--;
        prevCol = crosswordState.puzzle.grid[0].length - 1;
    }
}

function moveVertical(row, col, delta) {
    const newRow = row + delta;
    if (newRow >= 0 && newRow < crosswordState.puzzle.grid.length) {
        if (crosswordState.puzzle.grid[newRow][col] !== '#') {
            const input = document.querySelector(
                `.crossword-cell[data-row="${newRow}"][data-col="${col}"] input`
            );
            if (input) {
                input.focus();
            }
        }
    }
}

function checkCrosswordComplete() {
    let complete = true;
    let correct = true;
    
    for (let row = 0; row < crosswordState.puzzle.grid.length; row++) {
        for (let col = 0; col < crosswordState.puzzle.grid[row].length; col++) {
            if (crosswordState.puzzle.grid[row][col] !== '#') {
                if (!crosswordState.board[row][col]) {
                    complete = false;
                } else if (crosswordState.board[row][col] !== crosswordState.puzzle.grid[row][col]) {
                    correct = false;
                }
            }
        }
    }
    
    if (complete && correct) {
        setTimeout(() => {
            alert('🎉 Congratulations! You completed the crossword!');
        }, 100);
    }
}
