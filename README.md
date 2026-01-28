# 💝 Tessa's Games 💝

A beautiful, mobile-friendly web application featuring three classic games customized for Tessa: Wordle, Sudoku, and Crossword puzzles.

## 🎮 Games Included

### Wordle
- Guess special 5-letter words customized for Tessa
- Classic Wordle gameplay with color-coded feedback
- Customizable word list (includes TESSA, ANGEL, HEART, LOVED, and more)
- On-screen keyboard for mobile devices
- Physical keyboard support

### Sudoku
- Classic 9x9 number puzzle game
- Multiple difficulty levels
- Touch-friendly number input
- Error highlighting for incorrect entries
- Keyboard navigation support

### Crossword
- Custom crossword puzzles with personal clues
- Interactive grid with click-to-select cells
- Arrow key navigation
- Clue highlighting
- Mobile-optimized input

## 🚀 Getting Started

### Running Locally

Simply open `index.html` in your web browser, or use a local server:

```bash
# Using Python 3
python3 -m http.server 8080

# Using Node.js (if you have http-server installed)
npx http-server -p 8080
```

Then navigate to `http://localhost:8080` in your browser.

## 📱 Mobile Optimized

The app is designed with mobile users in mind:
- Responsive layout that adapts to any screen size
- Touch-friendly buttons and controls
- Optimized font sizes for mobile viewing
- Purple gradient theme that's easy on the eyes

## 🎨 Customization

### Adding Wordle Words
Edit `data.js` and add words to the `wordleWords` array:
```javascript
const wordleWords = [
    'TESSA',
    'YOURWORD',
    // Add more 5-letter words
];
```

### Adding Crossword Puzzles
Edit `data.js` and add new puzzle objects to the `crosswordPuzzles` array with your custom grid and clues.

### Adding Sudoku Puzzles
Edit `data.js` and add new puzzle objects to the `sudokuPuzzles` array with puzzle and solution grids.

## 🛠️ Tech Stack

- Pure HTML5, CSS3, and JavaScript (no frameworks required)
- Mobile-first responsive design
- Gradient backgrounds and modern UI elements

## 💖 Made with Love for Tessa