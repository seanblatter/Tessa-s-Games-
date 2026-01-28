// Game Data for Tessa's Games

// Wordle words - customizable for Tessa
const wordleWords = [
    'TESSA',
    'ANGEL',
    'HEART',
    'SMILE',
    'HAPPY',
    'SWEET',
    'LOVED',
    'DREAM',
    'MAGIC',
    'PEARL',
    'GRACE',
    'SHINE',
    'BLOOM',
    'CHARM',
    'DELIGHT',
    'BLISS',
    'ADORE',
    'DANCE',
    'BRAVE',
    'PRIDE'
];

// Crossword puzzles - customizable with personal clues
const crosswordPuzzles = [
    {
        grid: [
            ['T', 'E', 'S', 'S', 'A'],
            ['#', '#', 'M', '#', '#'],
            ['L', 'O', 'V', 'E', 'D'],
            ['#', '#', 'I', '#', '#'],
            ['H', 'A', 'P', 'P', 'Y']
        ],
        clues: {
            across: [
                { number: 1, clue: 'The most amazing person in the world', answer: 'TESSA', row: 0, col: 0, length: 5 },
                { number: 3, clue: 'A feeling of deep affection', answer: 'LOVED', row: 2, col: 0, length: 5 },
                { number: 5, clue: 'Feeling joy and contentment', answer: 'HAPPY', row: 4, col: 0, length: 5 }
            ],
            down: [
                { number: 2, clue: 'To be cheerful', answer: 'SMILE', row: 0, col: 2, length: 5 }
            ]
        }
    },
    {
        grid: [
            ['S', 'W', 'E', 'E', 'T'],
            ['#', '#', '#', '#', '#'],
            ['A', 'N', 'G', 'E', 'L'],
            ['#', '#', '#', '#', '#'],
            ['H', 'E', 'A', 'R', 'T']
        ],
        clues: {
            across: [
                { number: 1, clue: 'Having a pleasant taste or nature', answer: 'SWEET', row: 0, col: 0, length: 5 },
                { number: 2, clue: 'A divine messenger or perfect person', answer: 'ANGEL', row: 2, col: 0, length: 5 },
                { number: 3, clue: 'The organ that symbolizes love', answer: 'HEART', row: 4, col: 0, length: 5 }
            ],
            down: []
        }
    },
    {
        grid: [
            ['D', '#', 'B', '#', 'S'],
            ['R', '#', 'R', '#', 'H'],
            ['E', 'M', 'A', 'G', 'I', 'C'],
            ['A', '#', 'V', '#', 'N'],
            ['M', '#', 'E', '#', 'E']
        ],
        clues: {
            across: [
                { number: 2, clue: 'Supernatural power or enchantment', answer: 'MAGIC', row: 2, col: 1, length: 5 }
            ],
            down: [
                { number: 1, clue: 'A cherished aspiration', answer: 'DREAM', row: 0, col: 0, length: 5 },
                { number: 3, clue: 'Courageous and fearless', answer: 'BRAVE', row: 0, col: 2, length: 5 },
                { number: 4, clue: 'To emit light or be bright', answer: 'SHINE', row: 0, col: 4, length: 5 }
            ]
        }
    }
];

// Sudoku puzzles - various difficulty levels
const sudokuPuzzles = [
    {
        // Easy puzzle
        puzzle: [
            [5, 3, 0, 0, 7, 0, 0, 0, 0],
            [6, 0, 0, 1, 9, 5, 0, 0, 0],
            [0, 9, 8, 0, 0, 0, 0, 6, 0],
            [8, 0, 0, 0, 6, 0, 0, 0, 3],
            [4, 0, 0, 8, 0, 3, 0, 0, 1],
            [7, 0, 0, 0, 2, 0, 0, 0, 6],
            [0, 6, 0, 0, 0, 0, 2, 8, 0],
            [0, 0, 0, 4, 1, 9, 0, 0, 5],
            [0, 0, 0, 0, 8, 0, 0, 7, 9]
        ],
        solution: [
            [5, 3, 4, 6, 7, 8, 9, 1, 2],
            [6, 7, 2, 1, 9, 5, 3, 4, 8],
            [1, 9, 8, 3, 4, 2, 5, 6, 7],
            [8, 5, 9, 7, 6, 1, 4, 2, 3],
            [4, 2, 6, 8, 5, 3, 7, 9, 1],
            [7, 1, 3, 9, 2, 4, 8, 5, 6],
            [9, 6, 1, 5, 3, 7, 2, 8, 4],
            [2, 8, 7, 4, 1, 9, 6, 3, 5],
            [3, 4, 5, 2, 8, 6, 1, 7, 9]
        ]
    },
    {
        // Medium puzzle
        puzzle: [
            [0, 0, 0, 6, 0, 0, 4, 0, 0],
            [7, 0, 0, 0, 0, 3, 6, 0, 0],
            [0, 0, 0, 0, 9, 1, 0, 8, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 0, 1, 8, 0, 0, 0, 3],
            [0, 0, 0, 3, 0, 6, 0, 4, 5],
            [0, 4, 0, 2, 0, 0, 0, 6, 0],
            [9, 0, 3, 0, 0, 0, 0, 0, 0],
            [0, 2, 0, 0, 0, 0, 1, 0, 0]
        ],
        solution: [
            [5, 8, 1, 6, 7, 2, 4, 3, 9],
            [7, 9, 2, 8, 4, 3, 6, 5, 1],
            [3, 6, 4, 5, 9, 1, 7, 8, 2],
            [4, 3, 8, 9, 5, 7, 2, 1, 6],
            [2, 5, 6, 1, 8, 4, 9, 7, 3],
            [1, 7, 9, 3, 2, 6, 8, 4, 5],
            [8, 4, 5, 2, 1, 9, 3, 6, 7],
            [9, 1, 3, 7, 6, 8, 5, 2, 4],
            [6, 2, 7, 4, 3, 5, 1, 9, 8]
        ]
    },
    {
        // Another easy puzzle
        puzzle: [
            [0, 0, 0, 2, 6, 0, 7, 0, 1],
            [6, 8, 0, 0, 7, 0, 0, 9, 0],
            [1, 9, 0, 0, 0, 4, 5, 0, 0],
            [8, 2, 0, 1, 0, 0, 0, 4, 0],
            [0, 0, 4, 6, 0, 2, 9, 0, 0],
            [0, 5, 0, 0, 0, 3, 0, 2, 8],
            [0, 0, 9, 3, 0, 0, 0, 7, 4],
            [0, 4, 0, 0, 5, 0, 0, 3, 6],
            [7, 0, 3, 0, 1, 8, 0, 0, 0]
        ],
        solution: [
            [4, 3, 5, 2, 6, 9, 7, 8, 1],
            [6, 8, 2, 5, 7, 1, 4, 9, 3],
            [1, 9, 7, 8, 3, 4, 5, 6, 2],
            [8, 2, 6, 1, 9, 5, 3, 4, 7],
            [3, 7, 4, 6, 8, 2, 9, 1, 5],
            [9, 5, 1, 7, 4, 3, 6, 2, 8],
            [5, 1, 9, 3, 2, 6, 8, 7, 4],
            [2, 4, 8, 9, 5, 7, 1, 3, 6],
            [7, 6, 3, 4, 1, 8, 2, 5, 9]
        ]
    }
];
