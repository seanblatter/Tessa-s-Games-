/*
  Modern Color Picker for Tune Toons
  - Canvas-based HSL color picker with brightness slider
  - Drag to pick color, click to confirm
  - Visually matches reference UI
*/

class ModernColorPicker {
  constructor({ onPick, initial = { h: 0, s: 100, l: 50 } }) {
    this.onPick = onPick;
    this.h = initial.h;
    this.s = initial.s;
    this.l = initial.l;
    this.createElements();
    this.drawPicker();
    this.attachEvents();
    this.updatePreview();
  }

  createElements() {
    this.container = document.createElement('div');
    this.container.className = 'modern-color-picker';

    // Main color area (Hue/Sat)
    this.canvas = document.createElement('canvas');
    this.canvas.width = 240;
    this.canvas.height = 180;
    this.canvas.className = 'color-canvas';
    this.container.appendChild(this.canvas);

    // Brightness slider
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = 0;
    this.slider.max = 100;
    this.slider.value = this.l;
    this.slider.className = 'color-brightness-slider';
    this.container.appendChild(this.slider);

    // Preview
    this.preview = document.createElement('div');
    this.preview.className = 'color-preview-large';
    this.container.appendChild(this.preview);
  }

  drawPicker() {
    const ctx = this.canvas.getContext('2d');
    for (let x = 0; x < this.canvas.width; x++) {
      for (let y = 0; y < this.canvas.height; y++) {
        const h = (x / this.canvas.width) * 360;
        const s = (y / this.canvas.height) * 100;
        ctx.fillStyle = `hsl(${h},${s}%,${this.l}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Draw selection circle
    const selX = (this.h / 360) * this.canvas.width;
    const selY = (this.s / 100) * this.canvas.height;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(selX, selY, 8, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(selX, selY, 10, 0, 2 * Math.PI);
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  attachEvents() {
    this.canvas.addEventListener('mousedown', e => {
      this.handleDrag(e);
      const move = evt => this.handleDrag(evt);
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    this.slider.addEventListener('input', () => {
      this.l = parseInt(this.slider.value);
      this.drawPicker();
      this.updatePreview();
    });
  }

  handleDrag(e) {
    const rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = Math.max(0, Math.min(this.canvas.width - 1, x));
    y = Math.max(0, Math.min(this.canvas.height - 1, y));
    this.h = (x / this.canvas.width) * 360;
    this.s = (y / this.canvas.height) * 100;
    this.drawPicker();
    this.updatePreview();
  }

  updatePreview() {
    const rgb = ModernColorPicker.hslToRgb(this.h, this.s, this.l);
    this.preview.style.background = ModernColorPicker.rgbToHex(rgb);
    if (this.onPick) this.onPick(rgb, { h: this.h, s: this.s, l: this.l });
  }

  static hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  static rgbToHex({ r, g, b }) {
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
}

window.ModernColorPicker = ModernColorPicker;
