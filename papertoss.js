(() => {
    const WIDTH = 380;
    const HEIGHT = 560;
    const GRAVITY = 420;

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
            this.shots = 10;
            this.running = false;
            this.lastTs = 0;
            this.message = 'The boss keeps changing the fan speed. Sink it anyway.';
            this.bin = { x: WIDTH * 0.5, y: 148, w: 72, h: 58 };
            this.boss = { x: WIDTH * 0.5, dir: 1, t: 0 };
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

            const sx = WIDTH * 0.5;
            const sy = HEIGHT - 52;
            const dx = targetX - sx;
            const dy = targetY - sy;
            const vx = Math.max(-320, Math.min(320, dx * 1.7));
            const vy = Math.max(-540, Math.min(-260, dy * 1.25));
            this.paper = { x: sx, y: sy, vx, vy, r: 11, life: 0, trail: [] };
            this.shots -= 1;
            this.message = 'Nice arc... now beat that fan.';
            this.updateHud();
        }

        update(dt) {
            this.windTimer -= dt;
            this.boss.t += dt;
            this.boss.x += this.boss.dir * dt * 58;
            if (this.boss.x > WIDTH - 50) this.boss.dir = -1;
            if (this.boss.x < 50) this.boss.dir = 1;

            if (this.windTimer <= 0) {
                this.wind = (Math.random() * 2 - 1) * 95;
                this.windTimer = 2.2 + Math.random() * 1.8;
            }

            if (!this.paper) return;
            const p = this.paper;
            p.life += dt;
            p.vx += this.wind * dt * 0.45;
            p.vy += GRAVITY * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 14) p.trail.shift();

            const inRimX = p.x > this.bin.x - this.bin.w * 0.18 && p.x < this.bin.x + this.bin.w * 0.18;
            const inRimY = p.y > this.bin.y - 8 && p.y < this.bin.y + 8;
            const softDrop = p.vy > 120 && p.vy < 360;

            if (inRimX && inRimY && softDrop) {
                this.score += 1;
                this.paper = null;
                this.message = this.score % 3 === 0 ? 'Jerk boss is rattled. Nice streak!' : 'Swish! Clean bucket.';
                this.updateHud();
                return;
            }

            if (p.x < -20 || p.x > WIDTH + 20 || p.y < -20 || p.y > HEIGHT + 20 || p.life > 4.8) {
                this.paper = null;
                this.message = this.shots > 0 ? 'Missed. Adjust for the fan and try again.' : `Round over. Final score: ${this.score}`;
                this.updateHud();
            }
        }

        draw() {
            const ctx = this.ctx;
            if (!ctx) return;
            ctx.clearRect(0, 0, WIDTH, HEIGHT);

            const wallGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.58);
            wallGrad.addColorStop(0, '#f4f6ff');
            wallGrad.addColorStop(1, '#e4e8fb');
            ctx.fillStyle = wallGrad;
            ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.58);
            ctx.fillStyle = '#d5dcf5';
            for (let y = 30; y < HEIGHT * 0.56; y += 40) {
                ctx.fillRect(0, y, WIDTH, 1);
            }

            const floorGrad = ctx.createLinearGradient(0, HEIGHT * 0.58, 0, HEIGHT);
            floorGrad.addColorStop(0, '#d2b18f');
            floorGrad.addColorStop(1, '#b08867');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, HEIGHT * 0.58, WIDTH, HEIGHT * 0.42);

            this.drawDesk(ctx);
            this.drawBin(ctx);
            this.drawFan(ctx);
            this.drawBoss(ctx);
            this.drawPaper(ctx);
        }

        drawDesk(ctx) {
            ctx.fillStyle = '#8d6347';
            ctx.fillRect(26, HEIGHT * 0.58 + 72, WIDTH - 52, 16);
            ctx.fillStyle = '#714d36';
            ctx.fillRect(42, HEIGHT * 0.58 + 88, WIDTH - 84, 70);
        }

        drawBin(ctx) {
            const { x, y, w, h } = this.bin;
            ctx.fillStyle = 'rgba(20, 28, 44, 0.2)';
            ctx.beginPath();
            ctx.ellipse(x, y + h + 6, w * 0.4, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8f9cb6';
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y, w, h, 10);
            ctx.fill();
            ctx.fillStyle = '#cad3e5';
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#5b6785';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        drawFan(ctx) {
            const cx = 72;
            const cy = 188;
            ctx.fillStyle = '#687694';
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#51607f';
            for (let i = 0; i < 3; i += 1) {
                const ang = this.boss.t * 8 + (Math.PI * 2 * i) / 3;
                ctx.beginPath();
                ctx.ellipse(cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4, 6, 14, ang, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = '700 12px Inter, Arial';
            ctx.fillText(`Wind ${this.wind >= 0 ? '+' : ''}${this.wind.toFixed(1)}`, 18, 224);
        }

        drawBoss(ctx) {
            const x = this.boss.x;
            const y = 60;
            ctx.fillStyle = 'rgba(20, 30, 48, 0.12)';
            ctx.beginPath();
            ctx.ellipse(x, y + 44, 34, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2f3f5f';
            ctx.beginPath();
            ctx.roundRect(x - 20, y + 6, 40, 42, 10);
            ctx.fill();
            ctx.fillStyle = '#ffd5b1';
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1f2b42';
            ctx.fillRect(x - 12, y - 18, 24, 8);
            ctx.fillStyle = '#fff';
            ctx.font = '700 11px Inter, Arial';
            ctx.fillText('JERK BOSS', x - 28, y + 62);
        }

        drawPaper(ctx) {
            if (!this.paper) return;
            const p = this.paper;
            p.trail.forEach((pt, i) => {
                const alpha = (i + 1) / p.trail.length;
                ctx.fillStyle = `rgba(255,255,255,${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2 + alpha * 2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#d0d5e9';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
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
