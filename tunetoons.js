/*
Tune Toons Game Card
- Guess the color of a cartoon character's feature (e.g., hair, fur)
- UI inspired by https://toontone.games/ and provided reference images
- Uses images from 'untitled folder 2'
- Core logic and UI in this file
*/

const TUNE_TOONS_QUESTIONS = [
  {
    image: 'untitled folder 2/Phineas.jpg',
    question: "What is the color of Phineas's hair?",
    answer: { r: 218, g: 71, b: 44 },
    feature: 'hair',
  },
  {
    image: 'untitled folder 2/Garfield.jpg',
    question: "What is the color of Garfield's fur?",
    answer: { r: 240, g: 174, b: 66 },
    feature: 'fur',
  },
  {
    image: 'untitled folder 2/Jerry.jpg',
    question: "What is the color of Jerry's fur?",
    answer: { r: 198, g: 139, b: 51 },
    feature: 'fur',
  },
  {
    image: 'untitled folder 2/PinkPanther.jpg',
    question: "What is the color of Pink Panther's fur?",
    answer: { r: 232, g: 158, b: 187 },
    feature: 'fur',
  },
  {
    image: 'untitled folder 2/Bart.png',
    question: "What is the color of Bart's skin?",
    answer: { r: 248, g: 218, b: 76 },
    feature: 'skin',
  },
];

function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function colorDistance(c1, c2) {
  // Euclidean distance in RGB
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
  );
}

function getScore(distance) {
  // Max distance in RGB is ~441.67, scale to 10
  return Math.max(0, 10 - (distance / 441.67) * 10).toFixed(2);
}

function createColorPicker(onPick) {
  // Simple RGB sliders
  const container = document.createElement('div');
  container.className = 'color-picker';
  const sliders = ['r', 'g', 'b'].map(channel => {
    const label = document.createElement('label');
    label.textContent = channel.toUpperCase();
    const input = document.createElement('input');
    input.type = 'range';
    input.min = 0;
    input.max = 255;
    input.value = 128;
    input.className = 'color-slider';
    label.appendChild(input);
    container.appendChild(label);
    return input;
  });
  const preview = document.createElement('div');
  preview.className = 'color-preview';
  container.appendChild(preview);
  function updatePreview() {
    const color = {
      r: parseInt(sliders[0].value),
      g: parseInt(sliders[1].value),
      b: parseInt(sliders[2].value),
    };
    preview.style.background = rgbToHex(color);
    onPick(color);
  }
  sliders.forEach(slider => slider.addEventListener('input', updatePreview));
  updatePreview();
  return container;
}

function renderTuneToonsCard(container, questionObj) {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'tune-toons-card';

  // Question
  const q = document.createElement('h2');
  q.textContent = questionObj.question;
  card.appendChild(q);

  // Image
  const img = document.createElement('img');
  img.src = questionObj.image;
  img.alt = questionObj.feature;
  img.className = 'tune-toons-image';
  card.appendChild(img);

  // Color Picker
  let userColor = { r: 128, g: 128, b: 128 };
  const colorPicker = createColorPicker(color => {
    userColor = color;
  });
  card.appendChild(colorPicker);

  // Submit Button
  const submit = document.createElement('button');
  submit.textContent = 'Guess!';
  submit.className = 'tune-toons-submit';
  submit.onclick = () => {
    renderTuneToonsResult(container, questionObj, userColor);
  };
  card.appendChild(submit);

  container.appendChild(card);
}

function renderTuneToonsResult(container, questionObj, userColor) {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'tune-toons-card';

  // Image
  const img = document.createElement('img');
  img.src = questionObj.image;
  img.alt = questionObj.feature;
  img.className = 'tune-toons-image';
  card.appendChild(img);

  // Results
  const result = document.createElement('div');
  result.className = 'tune-toons-result';
  const userColorBox = document.createElement('div');
  userColorBox.className = 'color-box';
  userColorBox.style.background = rgbToHex(userColor);
  userColorBox.title = `Your Guess: R${userColor.r},G${userColor.g},B${userColor.b}`;
  const answerColorBox = document.createElement('div');
  answerColorBox.className = 'color-box';
  answerColorBox.style.background = rgbToHex(questionObj.answer);
  answerColorBox.title = `Correct: R${questionObj.answer.r},G${questionObj.answer.g},B${questionObj.answer.b}`;
  result.appendChild(userColorBox);
  result.appendChild(answerColorBox);

  // Score
  const distance = colorDistance(userColor, questionObj.answer);
  const score = getScore(distance);
  const scoreText = document.createElement('div');
  scoreText.className = 'tune-toons-score';
  scoreText.innerHTML = `<b>Score:</b> ${score}/10`;
  result.appendChild(scoreText);

  // Show RGB values
  const rgbText = document.createElement('div');
  rgbText.className = 'tune-toons-rgb';
  rgbText.innerHTML = `<b>Your Guess:</b> R${userColor.r},G${userColor.g},B${userColor.b}<br><b>Correct:</b> R${questionObj.answer.r},G${questionObj.answer.g},B${questionObj.answer.b}`;
  result.appendChild(rgbText);

  card.appendChild(result);

  // Next button
  const next = document.createElement('button');
  next.textContent = 'Next';
  next.className = 'tune-toons-next';
  next.onclick = () => {
    startTuneToonsGame(container);
  };
  card.appendChild(next);

  container.appendChild(card);
}

let tuneToonsIndex = 0;
function startTuneToonsGame(container) {
  if (tuneToonsIndex >= TUNE_TOONS_QUESTIONS.length) {
    tuneToonsIndex = 0;
  }
  const q = TUNE_TOONS_QUESTIONS[tuneToonsIndex++];
  renderTuneToonsCard(container, q);
}

// To use: call startTuneToonsGame(someContainerElement)
// Add CSS for .tune-toons-card, .color-picker, .color-slider, .color-preview, .color-box, etc.
