(() => {
    const WIDTH = 420;
    const HEIGHT = 560;
    const FLOOR_Y = HEIGHT * 0.58;
    const GRAVITY = 410;
    const WIN_SCORE = 8;

    const SKINS = [
        { id: 'classic', label: 'Classic', requiredPoints: 0, fill: '#ffffff', stroke: '#cfd6e8' },
        { id: 'neon', label: 'Neon', requiredPoints: 25, fill: '#d7fff3', stroke: '#37c69b' },
        { id: 'gold', label: 'Gold', requiredPoints: 75, fill: '#ffe9ac', stroke: '#d0a53a' },
        { id: 'galaxy', label: 'Galaxy', requiredPoints: 150, fill: '#d9d4ff', stroke: '#6a57d6' }
    ];

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    class PaperTossGame {
        constructor() {
            this.canvas = document.getElementById('papertoss-canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
            this.bindingsDone = false;
            this.profileLoaded = false;
            this.dragStart = null;
            this.dragCurrent = null;
            this.profile = {
                totalPoints: 0,
                unlockedSkins: ['classic'],
                selectedSkin: 'classic',
                bestRound: 0
            };
            this.reset();
        }

        async loadProfile() {
            if (this.profileLoaded) return;
            if (typeof window.getPaperTossProfile === 'function') {
                this.profile = await window.getPaperTossProfile();
            }
            this.profileLoaded = true;
            this.renderSkinButtons();
            this.updateHud();
        }

        reset() {
            this.paper = null;
            this.wind = 0;
            this.windTimer = 0;
            this.score = 0;
            this.shots = 12;
            this.running = false;
            this.lastTs = 0;
            this.roundOver = false;
            this.roundSubmitted = false;
            this.message = 'Tap to aim or swipe up to throw. Swipe length controls power.';
            this.bin = {
                x: WIDTH * 0.5,
                y: 152,
                w: 86,
                h: 66,
                rimY: 152,
                rimHalf: 24
            };
            this.throwOrigin = { x: WIDTH * 0.5, y: HEIGHT - 42 };
            this.boss = { x: WIDTH * 0.5, dir: 1, t: 0 };
            this.sparkles = [];
            this.togglePlayAgain(false);
            this.updateHud();
        }

        async start() {
            if (!this.canvas || !this.ctx) return;
            await this.loadProfile();
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

            const start = (event) => {
                const p = this.getPoint(event);
                this.dragStart = p;
                this.dragCurrent = p;
            };

            const move = (event) => {
                if (!this.dragStart) return;
                if (event.cancelable) event.preventDefault();
                this.dragCurrent = this.getPoint(event);
            };

            const end = async (event) => {
                if (!this.dragStart) return;
                if (event.cancelable) event.preventDefault();
                const endPoint = this.getPoint(event);
                const dx = endPoint.x - this.dragStart.x;
                const dy = endPoint.y - this.dragStart.y;
                const swipeDist = Math.hypot(dx, dy);
                if (swipeDist > 18 && dy < -6) {
                    this.throwFromSwipe(dx, dy);
                } else {
                    this.throwAt(endPoint.x, endPoint.y);
                }
                this.dragStart = null;
                this.dragCurrent = null;
                await this.onRoundStateChanged();
            };

            this.canvas.addEventListener('mousedown', start);
            this.canvas.addEventListener('mousemove', move);
            this.canvas.addEventListener('mouseup', end);
            this.canvas.addEventListener('mouseleave', () => {
                this.dragStart = null;
                this.dragCurrent = null;
            });

            this.canvas.addEventListener('touchstart', (event) => {
                if (event.cancelable) event.preventDefault();
                start(event);
            }, { passive: false });
            this.canvas.addEventListener('touchmove', move, { passive: false });
            this.canvas.addEventListener('touchend', end, { passive: false });

            const resetBtn = document.getElementById('papertoss-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', async () => {
                    this.reset();
                    await this.start();
                });
            }

            const playAgain = document.getElementById('papertoss-play-again');
            if (playAgain) {
                playAgain.addEventListener('click', async () => {
                    this.reset();
                    await this.start();
                });
            }
        }

        getPoint(event) {
            const rect = this.canvas.getBoundingClientRect();
            const sx = this.canvas.width / rect.width;
            const sy = this.canvas.height / rect.height;
            const src = event.changedTouches ? event.changedTouches[0] : event.touches ? event.touches[0] : event;
            return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
        }

        throwFromSwipe(dx, dy) {
            if (this.roundOver) return;
            if (this.paper || this.shots <= 0) return;
            const vx = clamp(dx * 2.15, -220, 220);
            const vy = -clamp(Math.abs(dy) * 6.3, 360, 860);
            this.spawnPaper(vx, vy, 'Swipe throw: longer swipe = more power.');
        }

        throwAt(targetX, targetY) {
            if (this.roundOver) return;
            if (this.paper || this.shots <= 0) return;
            const sx = this.throwOrigin.x;
            const sy = this.throwOrigin.y;
            const dx = targetX - sx;
            const horiz = clamp(dx * 1.52, -300, 300);
            const arcBoost = clamp((sy - targetY) * 1.7, 300, 860);
            this.spawnPaper(horiz, -arcBoost, 'Tap throw released.');
        }

        spawnPaper(vx, vy, message) {
            this.paper = {
                x: this.throwOrigin.x,
                y: this.throwOrigin.y,
                vx,
                vy,
                r: 10,
                life: 0,
                trail: [],
                scored: false,
                lastY: this.throwOrigin.y
            };
            this.shots -= 1;
            this.message = message;
            this.updateHud();
        }

        async finishRound(reason) {
            if (this.roundOver) return;
            this.roundOver = true;
            if (reason === 'win') {
                this.message = `You win! Round score ${this.score}. Tap Play Again.`;
            } else {
                this.message = `Out of shots! Round score ${this.score}. Tap Play Again.`;
            }
            this.togglePlayAgain(true);
            if (!this.roundSubmitted) {
                this.roundSubmitted = true;
                if (typeof window.recordPaperTossRound === 'function') {
                    await window.recordPaperTossRound(this.score);
                }
                if (typeof window.getPaperTossProfile === 'function') {
                    this.profile = await window.getPaperTossProfile();
                }
                this.renderSkinButtons();
            }
            this.updateHud();
        }

        scoreThrow() {
            this.score += 1;
            this.paper = null;
            this.message = this.score % 3 === 0 ? 'Swish streak!' : 'Bucket!';
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
            if (typeof window.addPaperTossPoints === 'function') {
                window.addPaperTossPoints(1)
                    .then((nextProfile) => {
                        if (nextProfile) {
                            this.profile = nextProfile;
                            this.renderSkinButtons();
                            this.updateHud();
                        }
                    })
                    .catch(() => {});
            }
            this.updateHud();
        }

        missThrow() {
            this.paper = null;
            if (this.shots > 0) {
                this.message = 'Missed. Aim higher or use a stronger upward swipe.';
            }
            this.updateHud();
        }

        togglePlayAgain(show) {
            const btn = document.getElementById('papertoss-play-again');
            if (!btn) return;
            btn.style.display = show ? 'block' : 'none';
        }

        renderSkinButtons() {
            const wrap = document.getElementById('papertoss-skins');
            if (!wrap) return;
            wrap.innerHTML = '';
            SKINS.forEach((skin) => {
                const unlocked = this.profile.unlockedSkins.includes(skin.id);
                const button = document.createElement('button');
                button.className = `papertoss-skin ${this.profile.selectedSkin === skin.id ? 'active' : ''}`;
                button.disabled = !unlocked;
                button.textContent = unlocked ? `${skin.label}` : `${skin.label} · ${skin.requiredPoints} pts`;
                button.addEventListener('click', async () => {
                    if (!unlocked) return;
                    this.profile.selectedSkin = skin.id;
                    if (typeof window.savePaperTossSkin === 'function') {
                        await window.savePaperTossSkin(skin.id);
                        if (typeof window.getPaperTossProfile === 'function') {
                            this.profile = await window.getPaperTossProfile();
                        }
                    }
                    this.renderSkinButtons();
                    this.updateHud();
                });
                wrap.appendChild(button);
            });
        }

        currentSkin() {
            return SKINS.find((skin) => skin.id === this.profile.selectedSkin) || SKINS[0];
        }

        async onRoundStateChanged() {
            if (this.roundOver) return;
            if (this.score >= WIN_SCORE) {
                await this.finishRound('win');
            } else if (this.shots <= 0 && !this.paper) {
                await this.finishRound('out');
            }
        }

        update(dt) {
            this.windTimer -= dt;
            this.boss.t += dt;
            this.boss.x += this.boss.dir * dt * 55;
            if (this.boss.x > WIDTH - 54) this.boss.dir = -1;
            if (this.boss.x < 54) this.boss.dir = 1;

            if (this.windTimer <= 0) {
                this.wind = (Math.random() * 2 - 1) * 68;
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
            const inWideOpening = p.x > this.bin.x - (this.bin.rimHalf + 18) && p.x < this.bin.x + (this.bin.rimHalf + 18);
            const falling = p.vy > 25;
            const droppedIntoBin = p.y >= this.bin.rimY - 6 && p.y <= this.bin.rimY + 40 && inWideOpening && falling;

            if (!p.scored && ((crossedRimDown && inRimWindow && falling) || droppedIntoBin)) {
                p.scored = true;
                this.scoreThrow();
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
            const outBounds = p.x < -30 || p.x > WIDTH + 30 || p.y < -260 || p.life > 6.2;
            if (hitFloor || outBounds) {
                this.missThrow();
            }

            if (!this.paper) {
                this.onRoundStateChanged();
            }
        }

        drawOfficeBackground(ctx) {
            const wallGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
            wallGrad.addColorStop(0, '#fbfcff');
            wallGrad.addColorStop(1, '#e8eefb');
            ctx.fillStyle = wallGrad;
            ctx.fillRect(0, 0, WIDTH, FLOOR_Y);

            // subtle wall pattern
            ctx.fillStyle = 'rgba(143, 161, 196, 0.16)';
            for (let y = 26; y < FLOOR_Y - 8; y += 36) ctx.fillRect(0, y, WIDTH, 1);

            // window + city skyline
            ctx.fillStyle = '#c9dbf6';
            ctx.fillRect(18, 16, 132, 96);
            ctx.fillStyle = '#a8c2e7';
            ctx.fillRect(24, 22, 120, 84);
            ctx.fillStyle = 'rgba(87, 118, 169, 0.35)';
            ctx.fillRect(34, 78, 14, 28);
            ctx.fillRect(52, 70, 18, 36);
            ctx.fillRect(76, 64, 16, 42);
            ctx.fillRect(96, 74, 22, 32);
            ctx.strokeStyle = '#8ea8cf';
            ctx.lineWidth = 2;
            ctx.strokeRect(18, 16, 132, 96);
            for (let y = 30; y < 98; y += 11) {
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(28, y, 112, 2);
            }

            // framed pictures
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#c3d0e8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(170, 18, 58, 40, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#9bb2d8';
            ctx.fillRect(178, 32, 42, 3);
            ctx.fillRect(178, 40, 30, 3);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(238, 18, 58, 40, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#9bb2d8';
            ctx.fillRect(246, 32, 42, 3);
            ctx.fillRect(246, 40, 30, 3);

            // filing cabinet
            ctx.fillStyle = '#c7d2e8';
            ctx.beginPath();
            ctx.roundRect(WIDTH - 86, 20, 60, 110, 8);
            ctx.fill();
            ctx.fillStyle = '#eff3fc';
            ctx.fillRect(WIDTH - 78, 28, 44, 86);
            ctx.fillStyle = '#8398bc';
            ctx.fillRect(WIDTH - 70, 38, 28, 5);
            ctx.fillRect(WIDTH - 70, 56, 28, 5);
            ctx.fillRect(WIDTH - 70, 74, 28, 5);

            // clock
            ctx.fillStyle = '#7084a8';
            ctx.beginPath();
            ctx.arc(WIDTH * 0.5, 50, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f5f8ff';
            ctx.beginPath();
            ctx.arc(WIDTH * 0.5, 50, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#7084a8';
            ctx.beginPath();
            ctx.moveTo(WIDTH * 0.5, 50);
            ctx.lineTo(WIDTH * 0.5, 42);
            ctx.moveTo(WIDTH * 0.5, 50);
            ctx.lineTo(WIDTH * 0.5 + 6, 53);
            ctx.stroke();

            const floorGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, HEIGHT);
            floorGrad.addColorStop(0, '#d3b392');
            floorGrad.addColorStop(1, '#b68b68');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

            // rug
            ctx.fillStyle = 'rgba(97, 126, 176, 0.22)';
            ctx.beginPath();
            ctx.ellipse(WIDTH * 0.52, FLOOR_Y + 90, 128, 36, 0, 0, Math.PI * 2);
            ctx.fill();

            // desk
            ctx.fillStyle = '#9b775b';
            ctx.beginPath();
            ctx.roundRect(34, FLOOR_Y + 52, WIDTH - 68, 86, 16);
            ctx.fill();
            ctx.fillStyle = '#7e5d45';
            ctx.fillRect(48, FLOOR_Y + 62, WIDTH - 96, 12);

            // monitor + keyboard
            ctx.fillStyle = '#dfe5f1';
            ctx.beginPath();
            ctx.roundRect(154, FLOOR_Y + 18, 94, 56, 8);
            ctx.fill();
            ctx.fillStyle = '#2f394b';
            ctx.fillRect(160, FLOOR_Y + 25, 82, 38);
            ctx.fillStyle = '#90a7d1';
            ctx.fillRect(194, FLOOR_Y + 74, 14, 5);
            ctx.fillStyle = '#7688aa';
            ctx.fillRect(168, FLOOR_Y + 84, 66, 7);

            // desk lamp
            ctx.strokeStyle = '#4d5f83';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(268, FLOOR_Y + 76);
            ctx.lineTo(282, FLOOR_Y + 50);
            ctx.lineTo(296, FLOOR_Y + 64);
            ctx.stroke();
            ctx.fillStyle = '#5f759e';
            ctx.beginPath();
            ctx.arc(268, FLOOR_Y + 78, 6, 0, Math.PI * 2);
            ctx.fill();

            // plant
            ctx.fillStyle = '#7eaf84';
            ctx.beginPath();
            ctx.ellipse(64, FLOOR_Y + 42, 16, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#677f69';
            ctx.fillRect(57, FLOOR_Y + 46, 14, 10);

            // report card
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#c6d2e8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(300, FLOOR_Y + 24, 84, 52, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#4e678f';
            ctx.font = '700 9px Inter, Arial';
            ctx.fillText('MONTHLY REPORT', 307, FLOOR_Y + 39);
            ctx.fillStyle = '#8fa3c8';
            ctx.fillRect(307, FLOOR_Y + 45, 67, 3);
            ctx.fillRect(307, FLOOR_Y + 51, 58, 3);
            ctx.fillRect(307, FLOOR_Y + 57, 62, 3);
        }

        drawBin(ctx) {
            const { x, y, w, h } = this.bin;
            ctx.fillStyle = 'rgba(16, 25, 41, 0.25)';
            ctx.beginPath();
            ctx.ellipse(x, y + h + 10, w * 0.46, 11, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#8b99b1';
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y + 7, w, h + 2, 10);
            ctx.fill();

            ctx.strokeStyle = 'rgba(235,242,255,0.42)';
            ctx.lineWidth = 1;
            for (let i = -3; i <= 3; i += 1) {
                const xx = x + i * 11;
                ctx.beginPath();
                ctx.moveTo(xx, y + 14);
                ctx.lineTo(xx, y + h + 4);
                ctx.stroke();
            }

            ctx.fillStyle = '#e9eff9';
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.53, 10.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#596887';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.53, 10.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        drawFan(ctx) {
            const cx = 88;
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
                ctx.bezierCurveTo(cx + 46 * dir, by - 6, cx + 88 * dir, by + 6, cx + 124 * dir, by);
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

            const skin = this.currentSkin();
            ctx.fillStyle = skin.fill;
            ctx.strokeStyle = skin.stroke;
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

        drawDragGuide(ctx) {
            if (!this.dragStart || !this.dragCurrent) return;
            ctx.strokeStyle = 'rgba(61, 88, 144, 0.45)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.dragStart.x, this.dragStart.y);
            ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
            ctx.stroke();
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
            this.drawDragGuide(ctx);
        }

        updateHud() {
            const stats = document.getElementById('papertoss-stats');
            const msg = document.getElementById('papertoss-message');
            if (stats) {
                stats.textContent = `Round ${this.score}/${WIN_SCORE} · Shots ${this.shots} · Wind ${this.wind >= 0 ? '+' : ''}${this.wind.toFixed(1)} · Total Pts ${this.profile.totalPoints}`;
            }
            if (msg) msg.textContent = this.message;
        }
    }

    let game = null;
    async function initPaperToss(forceReset = false) {
        if (!game) {
            game = new PaperTossGame();
        } else if (forceReset) {
            game.reset();
        }
        await game.start();
        game.updateHud();
    }

    window.initPaperToss = initPaperToss;
})();
