/*
  Reference-accurate vertical hue color picker for Tune Toons
  - Vertical hue slider, large color block, brightness slider
  - Drag to pick hue, adjust brightness
  - Designed to match reference images exactly
*/

class ReferenceColorPicker {
  constructor({ onPick, initial = { h: 0, s: 81, v: 70 } }) {
    this.onPick = onPick;
    this.h = initial.h;
    this.s = initial.s;
    this.v = initial.v;
    this.createElements();
    this.drawHueSlider();
    this.attachEvents();
    this.updatePreview();
  }

  createElements() {
    this.container = document.createElement('div');
    this.container.className = 'ref-color-picker';

    // Vertical hue slider
    this.hueSlider = document.createElement('canvas');
    this.hueSlider.width = 32;
    this.hueSlider.height = 220;
    this.hueSlider.className = 'ref-hue-slider';
    this.container.appendChild(this.hueSlider);

    // Large color preview
    this.preview = document.createElement('div');
    this.preview.className = 'ref-color-preview';
    this.container.appendChild(this.preview);

    // Brightness slider
    this.brightness = document.createElement('input');
    this.brightness.type = 'range';
    this.brightness.min = 0;
    this.brightness.max = 100;
    this.brightness.value = this.v;
    this.brightness.className = 'ref-brightness-slider';
    this.container.appendChild(this.brightness);
  }

  drawHueSlider() {
    const ctx = this.hueSlider.getContext('2d');
    for (let y = 0; y < this.hueSlider.height; y++) {
      const h = (y / this.hueSlider.height) * 360;
      ctx.fillStyle = `hsl(${h}, 100%, 50%)`;
      ctx.fillRect(0, y, this.hueSlider.width, 1);
    }
    // Draw selector dot
    const selY = (this.h / 360) * this.hueSlider.height;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.hueSlider.width / 2, selY, 8, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.hueSlider.width / 2, selY, 10, 0, 2 * Math.PI);
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  attachEvents() {
    this.hueSlider.addEventListener('mousedown', e => {
      this.handleHueDrag(e);
      const move = evt => this.handleHueDrag(evt);
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    this.brightness.addEventListener('input', () => {
      this.v = parseInt(this.brightness.value);
      this.updatePreview();
    });
  }

  handleHueDrag(e) {
    const rect = this.hueSlider.getBoundingClientRect();
    let y = e.clientY - rect.top;
    y = Math.max(0, Math.min(this.hueSlider.height - 1, y));
    this.h = (y / this.hueSlider.height) * 360;
    this.drawHueSlider();
    this.updatePreview();
  }

  updatePreview() {
    const rgb = ReferenceColorPicker.hsvToRgb(this.h, this.s, this.v);
    this.preview.style.background = ReferenceColorPicker.rgbToHex(rgb);
    if (this.onPick) this.onPick(rgb, { h: this.h, s: this.s, v: this.v });
  }

  static hsvToRgb(h, s, v) {
    s /= 100;
    v /= 100;
    let r, g, b;
    let i = Math.floor(h / 60);
    let f = h / 60 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
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

window.ReferenceColorPicker = ReferenceColorPicker;
