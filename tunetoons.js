/*
Tune Toons Game Card
- Guess the color of a cartoon character's feature (e.g., hair, fur)
- UI inspired by https://toontone.games/ and provided reference images
- Uses images from 'untitled folder 2'
- Core logic and UI in this file
*/

const TUNE_TOONS_QUESTIONS = [
  {
    image: 'Desktop/untitled folder 2/Phineas.jpg',
    question: "What is the color of Phineas's hair?",
    answer: { r: 218, g: 71, b: 44 },
    feature: 'hair',
  },
  {
    image: 'Desktop/untitled folder 2/Garfield.jpg',
    question: "What is the color of Garfield's fur?",
    answer: { r: 240, g: 174, b: 66 },
    feature: 'fur',
  },
  {
    image: 'Desktop/untitled folder 2/Jerry.jpg',
    question: "What is the color of Jerry's fur?",
    answer: { r: 198, g: 139, b: 51 },
    feature: 'fur',
  },
  {
    image: 'Desktop/untitled folder 2/PinkPanther.jpg',
    question: "What is the color of Pink Panther's fur?",
    answer: { r: 232, g: 158, b: 187 },
    feature: 'fur',
  },
  {
    image: 'Desktop/untitled folder 2/Bart.png',
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
  // Use ReferenceColorPicker (vertical hue slider, large color block, brightness slider)
  const picker = new window.ReferenceColorPicker({
    onPick: (rgb, hsv) => onPick(rgb, hsv),
    initial: { h: 0, s: 81, v: 70 }
  });
  return picker.container;
}

function renderTuneToonsCard(container, questionObj) {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'tune-toons-card tune-toons-guess-state ref-two-col';

  // Top: Question
  const header = document.createElement('div');
  header.className = 'tune-toons-header ref-header';
  header.innerHTML = `<span class=\"tune-toons-q\">What is the color of <b>${questionObj.feature}</b>?</span>`;
  card.appendChild(header);

  // Two-column layout
  const row = document.createElement('div');
  row.className = 'ref-row';

  // Left: Image
  const imgCol = document.createElement('div');
  imgCol.className = 'ref-img-col';
  const img = document.createElement('img');
  img.src = questionObj.image;
  img.alt = questionObj.feature;
  img.className = 'tune-toons-image ref-img';
  imgCol.appendChild(img);
  row.appendChild(imgCol);

  // Right: Color Picker
  const pickerCol = document.createElement('div');
  pickerCol.className = 'ref-picker-col';
  let userColor = { r: 218, g: 71, b: 44 };
  let userHSV = { h: 0, s: 81, v: 70 };
  const colorPicker = createColorPicker((color, hsv) => {
    userColor = color;
    userHSV = hsv;
    previewBox.style.background = rgbToHex(color);
    previewLabel.textContent = `R${color.r}, G${color.g}, B${color.b}`;
  });
  pickerCol.appendChild(colorPicker);
  // Large preview
  const previewBox = document.createElement('div');
  previewBox.className = 'color-preview-large ref-preview-large';
  const previewLabel = document.createElement('div');
  previewLabel.className = 'color-preview-label ref-preview-label';
  pickerCol.appendChild(previewBox);
  pickerCol.appendChild(previewLabel);
  row.appendChild(pickerCol);

  card.appendChild(row);

  // Submit Button
  const submit = document.createElement('button');
  submit.textContent = '✓';
  submit.className = 'tune-toons-submit ref-submit';
  submit.onclick = () => {
    renderTuneToonsResult(container, questionObj, userColor, userHSV);
  };
  card.appendChild(submit);

  container.appendChild(card);
}

function renderTuneToonsResult(container, questionObj, userColor, userHSV) {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'tune-toons-card tune-toons-result-state ref-two-col';

  // Top: Question
  const header = document.createElement('div');
  header.className = 'tune-toons-header ref-header';
  header.innerHTML = `<span class=\"tune-toons-q\">What is the color of <b>${questionObj.feature}</b>?</span>`;
  card.appendChild(header);

  // Two-column layout for result
  const row = document.createElement('div');
  row.className = 'ref-row';

  // Left: Image
  const imgCol = document.createElement('div');
  imgCol.className = 'ref-img-col';
  const img = document.createElement('img');
  img.src = questionObj.image;
  img.alt = questionObj.feature;
  img.className = 'tune-toons-image ref-img';
  imgCol.appendChild(img);
  row.appendChild(imgCol);

  // Right: Color feedback
  const pickerCol = document.createElement('div');
  pickerCol.className = 'ref-picker-col';
  // User color
  const userCol = document.createElement('div');
  userCol.className = 'color-box-large ref-result-color';
  userCol.style.background = rgbToHex(userColor);
  userCol.title = `Your Guess: R${userColor.r},G${userColor.g},B${userColor.b}`;
  // Correct color
  const answerCol = document.createElement('div');
  answerCol.className = 'color-box-large ref-result-color';
  answerCol.style.background = rgbToHex(questionObj.answer);
  answerCol.title = `Correct: R${questionObj.answer.r},G${questionObj.answer.g},B${questionObj.answer.b}`;
  // Label rows
  const labelRow = document.createElement('div');
  labelRow.className = 'ref-label-row';
  labelRow.innerHTML = `<span class='ref-label'>Your Selection</span><span class='ref-label'>Original</span>`;
  // Color row
  const colorRow = document.createElement('div');
  colorRow.className = 'ref-color-row';
  colorRow.appendChild(userCol);
  colorRow.appendChild(answerCol);
  pickerCol.appendChild(labelRow);
  pickerCol.appendChild(colorRow);
  // Score
  const distance = colorDistance(userColor, questionObj.answer);
  const score = getScore(distance);
  const scoreText = document.createElement('div');
  scoreText.className = 'tune-toons-score ref-score';
  scoreText.innerHTML = `${score}`;
  pickerCol.appendChild(scoreText);
  // Feedback
  const feedback = document.createElement('div');
  feedback.className = 'ref-feedback';
  feedback.textContent = score >= 9 ? 'Perfect!' : score >= 7 ? 'Great job!' : 'Keep practicing!';
  pickerCol.appendChild(feedback);
  // RGB values
  const rgbText = document.createElement('div');
  rgbText.className = 'tune-toons-rgb ref-rgb';
  rgbText.innerHTML = `<b>H${Math.round(userHSV.h)} S${Math.round(userHSV.s)} B${Math.round(userHSV.v)}</b><br><b>H0 S81 B70</b>`;
  pickerCol.appendChild(rgbText);
  row.appendChild(pickerCol);

  card.appendChild(row);

  // Next button
  const next = document.createElement('button');
  next.textContent = '→';
  next.className = 'tune-toons-next ref-next';
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
