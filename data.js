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

// Crossword clue bank for auto-generated puzzles
const crosswordClueBank = {
    CAT: 'Feline pet',
    APE: 'Primate',
    TEN: 'Number after nine',
    SUN: 'Day star',
    USE: 'Put to work',
    NET: 'Mesh catcher',
    EAR: 'Hearing organ',
    ARE: 'Plural of be',
    RED: 'Color of a stop sign',
    DOG: 'Loyal pet',
    ORE: 'Metal-bearing rock',
    GEL: 'Thickened liquid',
    PEN: 'Writing tool',
    ERA: 'Historical period',
    NEW: 'Not old',
    MAP: 'Navigation aid',
    PEA: 'Green pod seed',
    RAN: 'Moved quickly',
    ATE: 'Had a meal',
    NOW: 'At this time',
    LIP: 'Edge of the mouth',
    ION: 'Charged atom',
    PET: 'Companion animal'
};

// Crossword puzzles - 15x15 daily rotation
const crosswordPuzzles = [
    {
        grid: [
            'CAT#DOG#SUN#MAP',
            'APE#ORE#USE#ARE',
            'TEN#GEL#NET#PET',
            '###############',
            'DOG#SUN#MAP#CAT',
            'ORE#USE#ARE#APE',
            'GEL#NET#PET#TEN',
            '###############',
            'SUN#MAP#CAT#DOG',
            'USE#ARE#APE#ORE',
            'NET#PET#TEN#GEL',
            '###############',
            'MAP#CAT#DOG#SUN',
            'ARE#APE#ORE#USE',
            'PET#TEN#GEL#NET'
        ]
    },
    {
        grid: [
            'SUN#MAP#CAT#DOG',
            'USE#ARE#APE#ORE',
            'NET#PET#TEN#GEL',
            '###############',
            'MAP#CAT#DOG#SUN',
            'ARE#APE#ORE#USE',
            'PET#TEN#GEL#NET',
            '###############',
            'CAT#DOG#SUN#MAP',
            'APE#ORE#USE#ARE',
            'TEN#GEL#NET#PET',
            '###############',
            'DOG#SUN#MAP#CAT',
            'ORE#USE#ARE#APE',
            'GEL#NET#PET#TEN'
        ]
    },
    {
        grid: [
            'MAP#CAT#DOG#SUN',
            'ARE#APE#ORE#USE',
            'PET#TEN#GEL#NET',
            '###############',
            'CAT#DOG#SUN#MAP',
            'APE#ORE#USE#ARE',
            'TEN#GEL#NET#PET',
            '###############',
            'DOG#SUN#MAP#CAT',
            'ORE#USE#ARE#APE',
            'GEL#NET#PET#TEN',
            '###############',
            'SUN#MAP#CAT#DOG',
            'USE#ARE#APE#ORE',
            'NET#PET#TEN#GEL'
        ]
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
    },
    {
        // Easy variation
        puzzle: [
            [5, 0, 0, 0, 7, 0, 0, 1, 0],
            [0, 7, 0, 1, 0, 5, 0, 0, 8],
            [1, 0, 8, 0, 0, 2, 0, 6, 0],
            [0, 5, 0, 7, 0, 0, 4, 0, 3],
            [4, 0, 6, 0, 5, 0, 7, 0, 1],
            [0, 1, 0, 9, 0, 4, 0, 5, 0],
            [9, 0, 0, 5, 3, 0, 2, 0, 4],
            [0, 8, 0, 4, 0, 9, 0, 3, 0],
            [3, 0, 5, 0, 8, 0, 1, 0, 9]
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
        // Medium variation
        puzzle: [
            [0, 8, 1, 0, 7, 0, 4, 0, 9],
            [7, 0, 0, 8, 0, 3, 0, 5, 0],
            [0, 6, 0, 5, 0, 1, 7, 0, 2],
            [4, 0, 8, 0, 5, 0, 2, 1, 0],
            [0, 5, 0, 1, 0, 4, 0, 7, 0],
            [1, 0, 9, 0, 2, 0, 8, 0, 5],
            [0, 4, 0, 2, 1, 0, 3, 0, 7],
            [9, 0, 3, 0, 6, 8, 0, 2, 0],
            [0, 2, 7, 4, 0, 5, 1, 0, 8]
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
        // Easy variation
        puzzle: [
            [4, 0, 5, 0, 6, 0, 7, 8, 0],
            [0, 8, 0, 5, 0, 1, 0, 9, 0],
            [1, 0, 0, 8, 3, 0, 5, 0, 2],
            [0, 2, 6, 0, 9, 5, 0, 4, 0],
            [3, 0, 4, 6, 0, 2, 9, 0, 5],
            [0, 5, 0, 7, 4, 0, 6, 2, 0],
            [5, 1, 0, 3, 0, 6, 0, 7, 4],
            [0, 4, 8, 0, 5, 0, 1, 0, 6],
            [7, 0, 3, 4, 0, 8, 2, 0, 9]
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
