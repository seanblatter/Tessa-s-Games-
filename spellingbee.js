// Spelling Bee game logic

const spellingBeePuzzles = [
    { center: 'E', outer: ['A', 'R', 'S', 'T', 'L', 'P'] },
    { center: 'A', outer: ['R', 'C', 'D', 'M', 'N', 'T'] },
    { center: 'O', outer: ['B', 'L', 'M', 'N', 'R', 'T'] },
    { center: 'I', outer: ['B', 'E', 'L', 'N', 'S', 'T'] },
    { center: 'U', outer: ['B', 'D', 'E', 'L', 'R', 'T'] },
    { center: 'E', outer: ['B', 'D', 'I', 'N', 'R', 'T'] },
    { center: 'A', outer: ['B', 'E', 'L', 'P', 'R', 'T'] },
    { center: 'O', outer: ['C', 'D', 'E', 'L', 'N', 'R'] },
    { center: 'I', outer: ['A', 'C', 'L', 'N', 'R', 'T'] },
    { center: 'E', outer: ['C', 'L', 'M', 'N', 'R', 'T'] }
];

const beeSlots = ['top', 'top-right', 'bottom-right', 'bottom', 'bottom-left', 'top-left'];

// Fast local fallback + common words users expect.
const localBeeDictionary = new Set([
    'able', 'alert', 'alter', 'apple', 'are', 'ear', 'earn', 'easter', 'eat', 'eats',
    'eel', 'else', 'late', 'later', 'least', 'let', 'lets', 'pear', 'pearl',
    'pears', 'peat', 'petal', 'plate', 'pleat', 'rate', 'rates', 'real', 'rear', 'sale',
    'seal', 'sear', 'slate', 'stale', 'staple', 'star', 'stare', 'steal', 'tear', 'tears',
    'teal', 'tree', 'treat'
]);

const dictionaryCache = new Map();

let lastPuzzleIndex = -1;

let beeState = {
    puzzle: null,
    currentWord: '',
    foundWords: new Set(),
    score: 0,
    startTime: null,
    gameOver: false,
    isSubmitting: false
};

function initSpellingBee() {
    newSpellingBeeGame();
}

async function saveSpellingBeeScore(details) {
    if (!window.recordScore) return;
    await window.recordScore('spellingbee', details);
}

async function newSpellingBeeGame() {
    if (beeState.startTime && !beeState.gameOver) {
        await endSpellingBeeGame({
            silent: true,
            message: 'Previous game saved. Starting a new hive!'
        });
    }

    // Spelling Bee supports replay with new letter hives, so don't lock by daily-play checks.
    let nextIndex = Math.floor(Math.random() * spellingBeePuzzles.length);
    if (spellingBeePuzzles.length > 1 && nextIndex == lastPuzzleIndex) {
        nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (spellingBeePuzzles.length - 1))) % spellingBeePuzzles.length;
    }
    lastPuzzleIndex = nextIndex;

    const basePuzzle = spellingBeePuzzles[nextIndex];
    const puzzle = {
        center: basePuzzle.center,
        outer: basePuzzle.outer.slice()
    };

    beeState = {
        puzzle,
        currentWord: '',
        foundWords: new Set(),
        score: 0,
        startTime: Date.now(),
        gameOver: false,
        isSubmitting: false
    };

    renderBeeBoard();
    renderBeeEntry();
    renderBeeStats();
    renderBeeFoundWords();
    clearMessage('spellingbee');
}

async function endSpellingBeeGame(options = {}) {
    const { silent = false, message = `Game ended. Final score: ${beeState.score}.` } = options;
    if (beeState.gameOver) return;

    beeState.gameOver = true;
    beeState.currentWord = '';
    renderBeeEntry();

    const durationSeconds = Math.round((Date.now() - beeState.startTime) / 1000);

    await saveSpellingBeeScore({
        durationSeconds,
        wordsFound: beeState.foundWords.size,
        score: beeState.score
    });

    if (!silent) {
        showMessage('spellingbee', message, 'info');
    }
}

function pointsForBeeWord(word) {
    return word.length === 4 ? 1 : word.length;
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
    document.getElementById('bee-score').textContent = String(beeState.score);
    document.getElementById('bee-found-count').textContent = String(beeState.foundWords.size);
    document.getElementById('bee-total-count').textContent = 'Dictionary';
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

async function isDictionaryWord(word) {
    const lower = word.toLowerCase();
    if (dictionaryCache.has(lower)) return dictionaryCache.get(lower);
    if (localBeeDictionary.has(lower)) {
        dictionaryCache.set(lower, true);
        return true;
    }

    let hadNetworkFailure = false;
    const verdicts = [];

    // Source 1: Datamuse (exact word match in returned candidates).
    try {
        const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(lower)}&max=50`);
        if (!response.ok) {
            hadNetworkFailure = true;
        } else {
            const data = await response.json();
            const found = Array.isArray(data) && data.some((item) => item.word === lower);
            verdicts.push(found);
        }
    } catch (error) {
        hadNetworkFailure = true;
    }

    // Source 2: Free Dictionary API.
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lower)}`);
        if (response.ok) {
            verdicts.push(true);
        } else if (response.status === 404) {
            verdicts.push(false);
        } else {
            hadNetworkFailure = true;
        }
    } catch (error) {
        hadNetworkFailure = true;
    }

    let isValid = false;
    if (verdicts.includes(true)) {
        isValid = true;
    } else if (verdicts.length > 0 && verdicts.every((v) => v === false)) {
        isValid = false;
    } else if (hadNetworkFailure) {
        // Fail open on network issues to avoid false rejections in gameplay.
        isValid = true;
    }

    dictionaryCache.set(lower, isValid);
    return isValid;
}

async function submitBeeWord() {
    if (beeState.gameOver || beeState.isSubmitting) return;

    const word = beeState.currentWord.toUpperCase();
    beeState.currentWord = '';
    renderBeeEntry();

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
    } else if (beeState.foundWords.has(word)) {
        showMessage('spellingbee', 'Already found.', 'info');
        pulseBeeEntry('bad');
    } else {
        beeState.isSubmitting = true;
        showMessage('spellingbee', 'Checking dictionary…', 'info');
        const valid = await isDictionaryWord(word);
        beeState.isSubmitting = false;

        if (beeState.gameOver) return;

        if (!valid) {
            showMessage('spellingbee', 'Not a valid dictionary word.', 'error');
            pulseBeeEntry('bad');
        } else {
            const points = pointsForBeeWord(word);
            beeState.foundWords.add(word);
            beeState.score += points;
            showMessage('spellingbee', `Great! +${points} points`, 'success');
            pulseBeeEntry('good');
            renderBeeStats();
            renderBeeFoundWords();

            const durationSeconds = Math.round((Date.now() - beeState.startTime) / 1000);
            await saveSpellingBeeScore({
                durationSeconds,
                wordsFound: beeState.foundWords.size,
                score: beeState.score
            });
        }
    }

}

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('spellingbee-screen').classList.contains('active')) return;

    if (e.key === 'Enter') {
        submitBeeWord();
    } else if (e.key === 'Escape') {
        endSpellingBeeGame();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        deleteBeeLetter();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        addBeeLetter(e.key.toUpperCase());
    }
});
