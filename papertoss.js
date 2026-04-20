(() => {
    const WIDTH = 380;
    const HEIGHT = 560;
    const FLOOR_Y = HEIGHT * 0.58;
    const GRAVITY = 410;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    class PaperTossGame {
        constructor() {
            this.canvas = document.getElementById('papertoss-canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
            this.bindingsDone = false;
            this.reset();
        }

        reset() {
            this.paper = null;
            this.wind = 0;
            this.windTimer = 0;
            this.score = 0;
            this.shots = 12;
            this.running = false;
            this.lastTs = 0;
            this.message = 'Tap the canvas to throw. Aim a little above the bin.';
            this.bin = {
                x: WIDTH * 0.5,
                y: 150,
                w: 80,
                h: 62,
                rimY: 150,
                rimHalf: 18,
                innerBottomY: 198
            };
            this.throwOrigin = { x: WIDTH * 0.5, y: HEIGHT - 44 };
            this.boss = { x: WIDTH * 0.5, dir: 1, t: 0 };
            this.sparkles = [];
            this.updateHud();
        }

        start() {
            if (!this.canvas || !this.ctx) return;
            if (!this.bindingsDone) this.bindControls();
            this.running = true;
            this.lastTs = performance.now();
            requestAnimationFrame((ts) => this.loop(ts));
        }

        loop(ts) {
            if (!this.running) return;
            const dt = Math.min(1 / 30, (ts - this.lastTs) / 1000);
            this.lastTs = ts;
            this.update(dt);
            this.draw();
            requestAnimationFrame((next) => this.loop(next));
        }

        bindControls() {
            this.bindingsDone = true;
            const throwHandler = (event) => {
                if (event.cancelable) event.preventDefault();
                const p = this.getPoint(event);
                this.throwAt(p.x, p.y);
            };
            this.canvas.addEventListener('click', throwHandler);
            this.canvas.addEventListener('touchstart', throwHandler, { passive: false });

            const resetBtn = document.getElementById('papertoss-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.reset();
                    this.start();
                });
            }
        }

        getPoint(event) {
            const rect = this.canvas.getBoundingClientRect();
            const sx = this.canvas.width / rect.width;
            const sy = this.canvas.height / rect.height;
            const cx = event.touches ? event.touches[0].clientX : event.clientX;
            const cy = event.touches ? event.touches[0].clientY : event.clientY;
            return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
        }

        throwAt(targetX, targetY) {
            if (this.shots <= 0) {
                this.message = `Out of shots. Final score: ${this.score}`;
                this.updateHud();
                return;
            }
            if (this.paper) {
                this.message = 'Wait for this throw to finish.';
                this.updateHud();
                return;
            }

            const sx = this.throwOrigin.x;
            const sy = this.throwOrigin.y;
            const dx = targetX - sx;
            const dy = targetY - sy;

            const horiz = clamp(dx * 1.55, -290, 290);
            const arcBoost = clamp((sy - targetY) * 1.65, 280, 820);
            const vy = -arcBoost;

            this.paper = {
                x: sx,
                y: sy,
                vx: horiz,
                vy,
                r: 10,
                life: 0,
                trail: [],
                scored: false,
                lastY: sy
            };

            this.shots -= 1;
            this.message = 'Throw released... fight that office fan!';
            this.updateHud();
        }

        scoreThrow() {
            this.score += 1;
            this.paper = null;
            this.message = this.score % 3 === 0 ? 'Nothing but net. Boss is furious.' : 'Bucket!';
            for (let i = 0; i < 16; i += 1) {
                this.sparkles.push({
                    x: this.bin.x,
                    y: this.bin.rimY,
                    vx: (Math.random() * 2 - 1) * 120,
                    vy: -60 - Math.random() * 140,
                    life: 0.45 + Math.random() * 0.35,
                    t: 0
                });
            }
            this.updateHud();
        }

        missThrow() {
            this.paper = null;
            this.message = this.shots > 0
                ? 'Missed. Tip: aim slightly above the rim and adjust for wind.'
                : `Round over. Final score: ${this.score}`;
            this.updateHud();
        }

        update(dt) {
            this.windTimer -= dt;
            this.boss.t += dt;
            this.boss.x += this.boss.dir * dt * 55;
            if (this.boss.x > WIDTH - 54) this.boss.dir = -1;
            if (this.boss.x < 54) this.boss.dir = 1;

            if (this.windTimer <= 0) {
                this.wind = (Math.random() * 2 - 1) * 72;
                this.windTimer = 1.8 + Math.random() * 1.9;
            }

            this.sparkles = this.sparkles.filter((s) => {
                s.t += dt;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.vy += 220 * dt;
                return s.t < s.life;
            });

            if (!this.paper) return;
            const p = this.paper;
            p.life += dt;
            p.lastY = p.y;

            p.vx += this.wind * dt * 0.5;
            p.vy += GRAVITY * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 16) p.trail.shift();

            const crossedRimDown = p.lastY < this.bin.rimY && p.y >= this.bin.rimY;
            const inRimWindow = p.x > this.bin.x - this.bin.rimHalf && p.x < this.bin.x + this.bin.rimHalf;
            const falling = p.vy > 40;

            if (!p.scored && crossedRimDown && inRimWindow && falling) {
                p.scored = true;
                this.scoreThrow();
                return;
            }

            const clippedRim = p.y >= this.bin.rimY - 5
                && p.y <= this.bin.rimY + 5
                && ((p.x >= this.bin.x - this.bin.w * 0.46 && p.x <= this.bin.x - this.bin.w * 0.2)
                    || (p.x >= this.bin.x + this.bin.w * 0.2 && p.x <= this.bin.x + this.bin.w * 0.46));
            if (clippedRim) {
                p.vx *= 0.66;
                p.vy = Math.min(-110, -Math.abs(p.vy) * 0.36);
            }

            const hitFloor = p.y + p.r >= HEIGHT - 4;
            const outBounds = p.x < -28 || p.x > WIDTH + 28 || p.y < -30 || p.life > 5.3;
            if (hitFloor || outBounds) {
                this.missThrow();
            }
        }

        drawOfficeBackground(ctx) {
            const wallGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
            wallGrad.addColorStop(0, '#f8f9ff');
            wallGrad.addColorStop(1, '#e9edff');
            ctx.fillStyle = wallGrad;
            ctx.fillRect(0, 0, WIDTH, FLOOR_Y);

            ctx.fillStyle = '#d8dff3';
            for (let y = 26; y < FLOOR_Y - 15; y += 36) ctx.fillRect(0, y, WIDTH, 1);

            ctx.fillStyle = '#d7e3f5';
            ctx.fillRect(18, 20, 100, 64);
            ctx.fillStyle = '#b7c8e6';
            ctx.fillRect(23, 25, 90, 54);
            ctx.strokeStyle = '#95acd3';
            ctx.lineWidth = 2;
            ctx.strokeRect(18, 20, 100, 64);
            ctx.beginPath();
            ctx.moveTo(68, 20);
            ctx.lineTo(68, 84);
            ctx.stroke();

            ctx.fillStyle = '#c8d2ea';
            ctx.fillRect(WIDTH - 86, 24, 56, 96);
            ctx.fillStyle = '#eef2fb';
            ctx.fillRect(WIDTH - 80, 30, 44, 72);
            ctx.fillStyle = '#8ea0c3';
            ctx.fillRect(WIDTH - 72, 34, 28, 6);
            ctx.fillRect(WIDTH - 72, 46, 28, 6);
            ctx.fillRect(WIDTH - 72, 58, 28, 6);

            ctx.fillStyle = '#6f7ea3';
            ctx.beginPath();
            ctx.arc(188, 44, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#eef3ff';
            ctx.beginPath();
            ctx.arc(188, 44, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6f7ea3';
            ctx.beginPath();
            ctx.moveTo(188, 44);
            ctx.lineTo(188, 36);
            ctx.moveTo(188, 44);
            ctx.lineTo(194, 47);
            ctx.stroke();

            const floorGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, HEIGHT);
            floorGrad.addColorStop(0, '#d4b493');
            floorGrad.addColorStop(1, '#b88f6d');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

            ctx.fillStyle = '#9f7b5f';
            ctx.beginPath();
            ctx.roundRect(30, FLOOR_Y + 56, WIDTH - 60, 84, 16);
            ctx.fill();
            ctx.fillStyle = '#7f6149';
            ctx.fillRect(42, FLOOR_Y + 66, WIDTH - 84, 12);

            ctx.fillStyle = '#87b38a';
            ctx.beginPath();
            ctx.ellipse(55, FLOOR_Y + 44, 14, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6f8c78';
            ctx.fillRect(49, FLOOR_Y + 47, 12, 10);

            ctx.fillStyle = '#d9dee8';
            ctx.beginPath();
            ctx.roundRect(140, FLOOR_Y + 24, 74, 44, 8);
            ctx.fill();
            ctx.fillStyle = '#3a4358';
            ctx.fillRect(146, FLOOR_Y + 30, 62, 30);
            ctx.fillStyle = '#90a3c7';
            ctx.fillRect(170, FLOOR_Y + 68, 14, 4);

            ctx.fillStyle = '#8ea2c4';
            ctx.fillRect(248, FLOOR_Y + 30, 38, 22);
            ctx.fillStyle = '#f0f5ff';
            ctx.fillRect(252, FLOOR_Y + 34, 30, 14);

            ctx.fillStyle = '#b86a64';
            ctx.beginPath();
            ctx.roundRect(292, FLOOR_Y + 34, 56, 36, 10);
            ctx.fill();
            ctx.fillStyle = '#fce2df';
            ctx.font = '700 9px Inter, Arial';
            ctx.fillText('Q2 REPORT', 302, FLOOR_Y + 54);
        }

        drawBin(ctx) {
            const { x, y, w, h } = this.bin;
            ctx.fillStyle = 'rgba(16, 25, 41, 0.22)';
            ctx.beginPath();
            ctx.ellipse(x, y + h + 8, w * 0.45, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#8f9cb6';
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y + 5, w, h, 11);
            ctx.fill();

            ctx.fillStyle = '#e2e8f5';
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.52, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#5c6b88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.52, 10, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.beginPath();
            ctx.moveTo(x - w * 0.34, y + 18);
            ctx.lineTo(x + w * 0.34, y + 18);
            ctx.moveTo(x - w * 0.34, y + 32);
            ctx.lineTo(x + w * 0.34, y + 32);
            ctx.stroke();
        }

        drawFan(ctx) {
            const cx = 78;
            const cy = 188;
            ctx.fillStyle = '#667695';
            ctx.beginPath();
            ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4f607f';
            for (let i = 0; i < 4; i += 1) {
                const ang = this.boss.t * 8 + (Math.PI * 2 * i) / 4;
                ctx.beginPath();
                ctx.ellipse(cx + Math.cos(ang) * 3, cy + Math.sin(ang) * 3, 6, 15, ang, 0, Math.PI * 2);
                ctx.fill();
            }

            const flowAlpha = Math.min(0.34, Math.abs(this.wind) / 230);
            ctx.strokeStyle = `rgba(100,125,200,${flowAlpha})`;
            ctx.lineWidth = 2;
            const dir = this.wind >= 0 ? 1 : -1;
            for (let i = 0; i < 4; i += 1) {
                const by = cy - 20 + i * 10;
                ctx.beginPath();
                ctx.moveTo(cx + 24 * dir, by);
                ctx.bezierCurveTo(cx + 46 * dir, by - 6, cx + 78 * dir, by + 6, cx + 112 * dir, by);
                ctx.stroke();
            }
        }

        drawBoss(ctx) {
            const x = this.boss.x;
            const y = 58;
            ctx.fillStyle = 'rgba(15,22,35,0.14)';
            ctx.beginPath();
            ctx.ellipse(x, y + 46, 34, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2f3f5f';
            ctx.beginPath();
            ctx.roundRect(x - 21, y + 8, 42, 40, 10);
            ctx.fill();
            ctx.fillStyle = '#ffd7b5';
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1f2b42';
            ctx.fillRect(x - 12, y - 18, 24, 8);
            ctx.fillStyle = '#fff';
            ctx.font = '700 11px Inter, Arial';
            ctx.fillText('JERK BOSS', x - 29, y + 62);
        }

        drawPaper(ctx) {
            if (!this.paper) return;
            const p = this.paper;
            p.trail.forEach((pt, i) => {
                const alpha = (i + 1) / p.trail.length;
                ctx.fillStyle = `rgba(255,255,255,${alpha * 0.28})`;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2 + alpha * 2.5, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#cfd6e8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        drawSparkles(ctx) {
            this.sparkles.forEach((s) => {
                const a = 1 - s.t / s.life;
                ctx.fillStyle = `rgba(255, 225, 120, ${a})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 2.1, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        drawHudOverlay(ctx) {
            ctx.fillStyle = 'rgba(26, 36, 56, 0.63)';
            ctx.fillRect(10, 8, WIDTH - 20, 24);
            ctx.fillStyle = '#ecf2ff';
            ctx.font = '700 12px Inter, Arial';
            ctx.fillText(`Wind ${this.wind >= 0 ? '+' : ''}${this.wind.toFixed(1)}`, 18, 24);
            ctx.fillText('Tip: aim above rim', WIDTH - 118, 24);
        }

        draw() {
            const ctx = this.ctx;
            if (!ctx) return;
            ctx.clearRect(0, 0, WIDTH, HEIGHT);
            this.drawOfficeBackground(ctx);
            this.drawFan(ctx);
            this.drawBin(ctx);
            this.drawBoss(ctx);
            this.drawPaper(ctx);
            this.drawSparkles(ctx);
            this.drawHudOverlay(ctx);
        }

        updateHud() {
            const stats = document.getElementById('papertoss-stats');
            const msg = document.getElementById('papertoss-message');
            if (stats) stats.textContent = `Score ${this.score} · Shots ${this.shots} · Wind ${this.wind >= 0 ? '+' : ''}${this.wind.toFixed(1)}`;
            if (msg) msg.textContent = this.message;
        }
    }

    let game = null;
    function initPaperToss(forceReset = false) {
        if (!game) {
            game = new PaperTossGame();
        } else if (forceReset) {
            game.reset();
        }
        game.start();
        game.updateHud();
    }

    window.initPaperToss = initPaperToss;
})();
