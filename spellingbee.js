// Spelling Bee game logic

const spellingBeePuzzles = [
    {
        center: 'E',
        outer: ['A', 'R', 'S', 'T', 'L', 'P'],
        words: [
            'ASTER', 'LEAPS', 'LEAPT', 'LEAST', 'PASTE', 'PASTEL',
            'PEARL', 'PEARS', 'PETAL', 'PETALS', 'PLASTER', 'PLATE',
            'PLATES', 'PLEAT', 'PLEATS', 'REAPS', 'RATES', 'SLATE',
            'SPARE', 'SPEAR', 'STALE', 'STAPLE', 'STAPLER', 'STARE',
            'STEAL', 'TEARS'
        ]
    }
];

const beeSlots = ['top', 'top-right', 'bottom-right', 'bottom', 'bottom-left', 'top-left'];

let beeState = {
    puzzle: null,
    currentWord: '',
    foundWords: new Set(),
    score: 0,
    maxScore: 0,
    startTime: null,
    gameOver: false
};

function initSpellingBee() {
    newSpellingBeeGame();
}

function newSpellingBeeGame() {
    if (window.canPlayDailyGame && !window.canPlayDailyGame('spellingbee')) {
        beeState.gameOver = true;
        return;
    }

    const basePuzzle = spellingBeePuzzles[Math.floor(Math.random() * spellingBeePuzzles.length)];
    const puzzle = {
        center: basePuzzle.center,
        outer: basePuzzle.outer.slice(),
        words: basePuzzle.words.slice()
    };

    beeState = {
        puzzle,
        currentWord: '',
        foundWords: new Set(),
        score: 0,
        maxScore: puzzle.words.reduce((total, word) => total + pointsForBeeWord(word, puzzle), 0),
        startTime: Date.now(),
        gameOver: false
    };

    renderBeeBoard();
    renderBeeEntry();
    renderBeeStats();
    renderBeeFoundWords();
    clearMessage('spellingbee');
}

function pointsForBeeWord(word, puzzle = beeState.puzzle) {
    const base = word.length === 4 ? 1 : word.length;
    const letterSet = new Set([puzzle.center, ...puzzle.outer]);
    const isPangram = [...letterSet].every((letter) => word.includes(letter));
    return base + (isPangram ? 7 : 0);
}

function pulseBeeEntry(type) {
    const entry = document.getElementById('bee-entry');
    entry.classList.remove('bee-entry-shake', 'bee-entry-pop');
    void entry.offsetWidth;
    entry.classList.add(type === 'bad' ? 'bee-entry-shake' : 'bee-entry-pop');
}

function animateBeeLetterPress(letter) {
    const match = [...document.querySelectorAll('.bee-letter')].find((el) => el.textContent === letter);
    if (!match) return;
    match.classList.remove('pressed');
    void match.offsetWidth;
    match.classList.add('pressed');
}

function renderBeeBoard() {
    const board = document.getElementById('bee-board');
    board.innerHTML = '';

    beeState.puzzle.outer.forEach((letter, index) => {
        const button = document.createElement('button');
        button.className = `bee-letter outer slot-${beeSlots[index]}`;
        button.type = 'button';
        button.textContent = letter;
        button.setAttribute('aria-label', `Outer letter ${letter}`);
        button.onclick = () => addBeeLetter(letter);
        board.appendChild(button);
    });

    const center = document.createElement('button');
    center.className = 'bee-letter center';
    center.type = 'button';
    center.textContent = beeState.puzzle.center;
    center.setAttribute('aria-label', `Center letter ${beeState.puzzle.center}`);
    center.onclick = () => addBeeLetter(beeState.puzzle.center);
    board.appendChild(center);
}

function renderBeeEntry() {
    document.getElementById('bee-entry').textContent = beeState.currentWord || '—';
}

function renderBeeStats() {
    document.getElementById('bee-score').textContent = `${beeState.score}/${beeState.maxScore}`;
    document.getElementById('bee-found-count').textContent = beeState.foundWords.size;
    document.getElementById('bee-total-count').textContent = beeState.puzzle.words.length;
}

function renderBeeFoundWords() {
    const wrap = document.getElementById('bee-found-words');
    const words = [...beeState.foundWords].sort();
    wrap.innerHTML = words.length
        ? words.map((word) => `<span class="bee-word-chip">${word.toLowerCase()}</span>`).join('')
        : '<span class="bee-placeholder">Find your first word!</span>';
}

function addBeeLetter(letter) {
    if (beeState.gameOver) return;
    if (beeState.currentWord.length >= 18) return;
    beeState.currentWord += letter;
    renderBeeEntry();
    animateBeeLetterPress(letter);
}

function deleteBeeLetter() {
    if (beeState.gameOver) return;
    beeState.currentWord = beeState.currentWord.slice(0, -1);
    renderBeeEntry();
}

function shuffleBeeLetters() {
    if (beeState.gameOver) return;
    for (let i = beeState.puzzle.outer.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [beeState.puzzle.outer[i], beeState.puzzle.outer[j]] = [beeState.puzzle.outer[j], beeState.puzzle.outer[i]];
    }
    renderBeeBoard();
}

function submitBeeWord() {
    if (beeState.gameOver) return;

    const word = beeState.currentWord.toUpperCase();
    const allowed = new Set([beeState.puzzle.center, ...beeState.puzzle.outer]);

    if (word.length < 4) {
        showMessage('spellingbee', 'Word is too short.', 'error');
        pulseBeeEntry('bad');
    } else if (!word.includes(beeState.puzzle.center)) {
        showMessage('spellingbee', `Word must include ${beeState.puzzle.center}.`, 'error');
        pulseBeeEntry('bad');
    } else if ([...word].some((letter) => !allowed.has(letter))) {
        showMessage('spellingbee', 'Word uses letters outside the hive.', 'error');
        pulseBeeEntry('bad');
    } else if (!beeState.puzzle.words.includes(word)) {
        showMessage('spellingbee', 'Not in this puzzle\'s dictionary.', 'error');
        pulseBeeEntry('bad');
    } else if (beeState.foundWords.has(word)) {
        showMessage('spellingbee', 'Already found.', 'info');
        pulseBeeEntry('bad');
    } else {
        const points = pointsForBeeWord(word);
        beeState.foundWords.add(word);
        beeState.score += points;
        showMessage('spellingbee', `Great! +${points} points`, 'success');
        pulseBeeEntry('good');
        renderBeeStats();
        renderBeeFoundWords();

        if (beeState.foundWords.size === beeState.puzzle.words.length) {
            beeState.gameOver = true;
            showMessage('spellingbee', '🐝 Amazing! You found every word!', 'success');
            if (window.recordScore) {
                const durationSeconds = Math.round((Date.now() - beeState.startTime) / 1000);
                window.recordScore('spellingbee', {
                    durationSeconds,
                    wordsFound: beeState.foundWords.size,
                    score: beeState.score
                });
            }
        }
    }

    beeState.currentWord = '';
    renderBeeEntry();
}

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('spellingbee-screen').classList.contains('active')) return;

    if (e.key === 'Enter') {
        submitBeeWord();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        deleteBeeLetter();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        addBeeLetter(e.key.toUpperCase());
    }
});
