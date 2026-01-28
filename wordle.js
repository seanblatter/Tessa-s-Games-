// Wordle Game Logic

let wordleState = {
    targetWord: '',
    currentRow: 0,
    currentTile: 0,
    gameOver: false,
    board: [],
    keyboardState: {},
    startTime: null
};

function initWordle() {
    newWordleGame();
    createWordleKeyboard();
}

function newWordleGame() {
    // Reset state
    wordleState = {
        targetWord: wordleWords[Math.floor(Math.random() * wordleWords.length)],
        currentRow: 0,
        currentTile: 0,
        gameOver: false,
        board: Array(6).fill().map(() => Array(5).fill('')),
        keyboardState: {},
        startTime: Date.now()
    };
    
    createWordleBoard();
    createWordleKeyboard();
    clearMessage('wordle');
    
    console.log('Target word:', wordleState.targetWord); // Debug only
}

function createWordleBoard() {
    const board = document.getElementById('wordle-board');
    board.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'wordle-row';
        
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement('div');
            tile.className = 'wordle-tile';
            tile.dataset.row = i;
            tile.dataset.col = j;
            row.appendChild(tile);
        }
        
        board.appendChild(row);
    }
}

function createWordleKeyboard() {
    const keyboard = document.getElementById('wordle-keyboard');
    keyboard.innerHTML = '';
    
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '←']
    ];
    
    rows.forEach(rowKeys => {
        const row = document.createElement('div');
        row.className = 'keyboard-row';
        
        rowKeys.forEach(key => {
            const button = document.createElement('button');
            button.className = 'key';
            button.textContent = key;
            
            if (key === 'ENTER' || key === '←') {
                button.classList.add('wide');
            }
            
            if (wordleState.keyboardState[key]) {
                button.classList.add(wordleState.keyboardState[key]);
            }
            
            button.onclick = () => handleWordleKey(key);
            row.appendChild(button);
        });
        
        keyboard.appendChild(row);
    });
}

function handleWordleKey(key) {
    if (wordleState.gameOver) return;
    
    if (key === '←') {
        handleWordleBackspace();
    } else if (key === 'ENTER') {
        handleWordleEnter();
    } else {
        handleWordleLetter(key);
    }
}

function handleWordleLetter(letter) {
    if (wordleState.currentTile < 5) {
        wordleState.board[wordleState.currentRow][wordleState.currentTile] = letter;
        updateWordleTile(wordleState.currentRow, wordleState.currentTile, letter);
        wordleState.currentTile++;
    }
}

function handleWordleBackspace() {
    if (wordleState.currentTile > 0) {
        wordleState.currentTile--;
        wordleState.board[wordleState.currentRow][wordleState.currentTile] = '';
        updateWordleTile(wordleState.currentRow, wordleState.currentTile, '');
    }
}

function handleWordleEnter() {
    if (wordleState.currentTile === 5) {
        const guess = wordleState.board[wordleState.currentRow].join('');
        checkWordleGuess(guess);
    } else {
        showMessage('wordle', 'Not enough letters', 'error');
    }
}

function checkWordleGuess(guess) {
    const result = [];
    const targetLetters = wordleState.targetWord.split('');
    const guessLetters = guess.split('');
    const letterCount = {};
    
    // Count letters in target
    targetLetters.forEach(letter => {
        letterCount[letter] = (letterCount[letter] || 0) + 1;
    });
    
    // First pass: mark correct positions
    guessLetters.forEach((letter, i) => {
        if (letter === targetLetters[i]) {
            result[i] = 'correct';
            letterCount[letter]--;
        }
    });
    
    // Second pass: mark present and absent
    guessLetters.forEach((letter, i) => {
        if (result[i] !== 'correct') {
            if (letterCount[letter] > 0) {
                result[i] = 'present';
                letterCount[letter]--;
            } else {
                result[i] = 'absent';
            }
        }
    });
    
    // Update tiles and keyboard
    result.forEach((state, i) => {
        const tile = document.querySelector(`.wordle-tile[data-row="${wordleState.currentRow}"][data-col="${i}"]`);
        setTimeout(() => {
            tile.classList.add(state);
        }, i * 100);
        
        const letter = guessLetters[i];
        if (!wordleState.keyboardState[letter] || 
            (state === 'correct' || 
             (state === 'present' && wordleState.keyboardState[letter] !== 'correct'))) {
            wordleState.keyboardState[letter] = state;
        }
    });
    
    // Update keyboard
    setTimeout(() => {
        createWordleKeyboard();
    }, 500);
    
    // Check win/loss
    if (guess === wordleState.targetWord) {
        wordleState.gameOver = true;
        setTimeout(() => {
            showMessage('wordle', '🎉 Congratulations! You found the word!', 'success');
            if (window.recordScore) {
                const durationSeconds = Math.round((Date.now() - wordleState.startTime) / 1000);
                window.recordScore('wordle', {
                    attempts: wordleState.currentRow + 1,
                    durationSeconds
                });
            }
        }, 600);
    } else if (wordleState.currentRow === 5) {
        wordleState.gameOver = true;
        setTimeout(() => {
            showMessage('wordle', `Game Over! The word was ${wordleState.targetWord}`, 'error');
        }, 600);
    } else {
        wordleState.currentRow++;
        wordleState.currentTile = 0;
    }
}

function updateWordleTile(row, col, letter) {
    const tile = document.querySelector(`.wordle-tile[data-row="${row}"][data-col="${col}"]`);
    tile.textContent = letter;
    if (letter) {
        tile.classList.add('filled');
    } else {
        tile.classList.remove('filled');
    }
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('wordle-screen').classList.contains('active')) return;
    
    if (e.key === 'Enter') {
        handleWordleKey('ENTER');
    } else if (e.key === 'Backspace') {
        handleWordleKey('←');
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleWordleKey(e.key.toUpperCase());
    }
});
