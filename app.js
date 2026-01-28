// Main App Logic

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    showMenu();
});

// Screen navigation
function showMenu() {
    hideAllScreens();
    document.getElementById('menu-screen').classList.add('active');
}

function showGame(gameName) {
    hideAllScreens();
    const screenId = `${gameName}-screen`;
    document.getElementById(screenId).classList.add('active');
    
    // Initialize the game
    switch(gameName) {
        case 'wordle':
            initWordle();
            break;
        case 'sudoku':
            initSudoku();
            break;
        case 'crossword':
            initCrossword();
            break;
    }
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

// Message handling
function showMessage(game, text, type) {
    const messageDiv = document.getElementById(`${game}-message`);
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

function clearMessage(game) {
    const messageDiv = document.getElementById(`${game}-message`);
    if (messageDiv) {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
        messageDiv.style.display = 'none';
    }
}
