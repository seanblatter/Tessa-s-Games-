// Clash browser game: real-time lane battle with bots.

(() => {
    const LANES = [150, 280, 410];
    const WIDTH = 980;
    const HEIGHT = 540;

    const UNITS = {
        knight: { name: 'Knight', cost: 3, hp: 220, speed: 86, dmg: 34, cooldown: 0.8, range: 20, radius: 10, color: '#5d8dff' },
        archer: { name: 'Archer', cost: 3, hp: 120, speed: 68, dmg: 26, cooldown: 1.0, range: 145, radius: 9, color: '#58c58f', projectileSpeed: 320 },
        giant: { name: 'Giant', cost: 5, hp: 480, speed: 50, dmg: 58, cooldown: 1.2, range: 24, radius: 14, color: '#f2a24e', towerOnly: true },
        wizard: { name: 'Wizard', cost: 4, hp: 165, speed: 62, dmg: 30, cooldown: 1.0, range: 130, radius: 10, color: '#ae7bff', projectileSpeed: 280, splash: 42 },
        bomber: { name: 'Bomber', cost: 3, hp: 130, speed: 64, dmg: 36, cooldown: 1.2, range: 120, radius: 9, color: '#ff7c86', projectileSpeed: 260, splash: 60 }
    };

    const LEVELS = [
        { name: 'Emerald Plains', bg: '#d8f7df', field: '#bdecc3', river: '#9ed0ff', bridge: '#9e7d5f', botSkill: 0.9 },
        { name: 'Sunset Canyon', bg: '#ffe0c1', field: '#f2cb9c', river: '#9fcdf7', bridge: '#a07050', botSkill: 1.1 },
        { name: 'Frostforge', bg: '#d8e8fb', field: '#c2daf3', river: '#9dc6ed', bridge: '#7a91aa', botSkill: 1.25 }
    ];

    class ClashBrowserGame {
        constructor() {
            this.canvas = document.getElementById('clash-canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
            this.level = 0;
            this.running = false;
            this.lastTime = 0;
            this.reset();
        }

        reset() {
            this.units = [];
            this.projectiles = [];
            this.playerElixir = 5;
            this.botElixir = 5;
            this.playerCrown = 0;
            this.botCrown = 0;
            this.timeLeft = 180;
            this.spawnCooldown = 1.4;
            this.selected = 'knight';
            this.selectedLane = 1;
            this.message = '';
            this.gameOver = false;

            this.towers = [
                this.mkTower('player', 120, LANES[0] - 44, 'princess'),
                this.mkTower('player', 120, LANES[2] + 44, 'princess'),
                this.mkTower('player', 72, LANES[1], 'king'),
                this.mkTower('bot', WIDTH - 120, LANES[0] - 44, 'princess'),
                this.mkTower('bot', WIDTH - 120, LANES[2] + 44, 'princess'),
                this.mkTower('bot', WIDTH - 72, LANES[1], 'king')
            ];
        }

        mkTower(team, x, y, kind) {
            return {
                team,
                x,
                y,
                kind,
                hp: kind === 'king' ? 2200 : 1300,
                maxHp: kind === 'king' ? 2200 : 1300,
                dmg: kind === 'king' ? 52 : 34,
                range: kind === 'king' ? 220 : 200,
                cooldown: kind === 'king' ? 0.82 : 0.9,
                atk: 0,
                alive: true
            };
        }

        start() {
            if (!this.canvas || !this.ctx) return;
            if (this.running) return;
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }

        stop() {
            this.running = false;
        }

        loop(ts) {
            if (!this.running) return;
            const dt = Math.min(0.033, (ts - this.lastTime) / 1000);
            this.lastTime = ts;
            this.update(dt);
            this.draw();
            requestAnimationFrame((t) => this.loop(t));
        }

        spawn(kind, team, lane) {
            const stat = UNITS[kind];
            if (!stat) return false;
            if (team === 'player') {
                if (this.playerElixir < stat.cost) return false;
                this.playerElixir -= stat.cost;
            } else if (this.botElixir < stat.cost) return false;
            else this.botElixir -= stat.cost;

            this.units.push({
                kind,
                lane,
                team,
                x: team === 'player' ? 180 : WIDTH - 180,
                y: LANES[lane] + (Math.random() * 14 - 7),
                hp: stat.hp,
                maxHp: stat.hp,
                atk: Math.random() * stat.cooldown,
                alive: true
            });
            return true;
        }

        update(dt) {
            if (this.gameOver) return;

            const level = LEVELS[this.level];
            this.timeLeft = Math.max(0, this.timeLeft - dt);
            const regen = this.timeLeft < 60 ? 1.5 : 0.85;
            this.playerElixir = Math.min(10, this.playerElixir + regen * dt);
            this.botElixir = Math.min(10, this.botElixir + (regen + 0.25) * dt);

            this.spawnCooldown -= dt;
            if (this.spawnCooldown <= 0) {
                this.botTurn(level.botSkill);
                this.spawnCooldown = 1.1 + Math.random() * (1.2 / level.botSkill);
            }

            for (const tower of this.towers) {
                if (!tower.alive) continue;
                tower.atk -= dt;
                const target = this.nearestEnemyUnit(tower.team, tower.x, tower.y, tower.range);
                if (target && tower.atk <= 0) {
                    this.projectiles.push({
                        x: tower.x,
                        y: tower.y,
                        team: tower.team,
                        target,
                        speed: 360,
                        dmg: tower.dmg,
                        splash: 0,
                        color: tower.team === 'player' ? '#5d8dff' : '#ff6f7a'
                    });
                    tower.atk = tower.cooldown;
                }
            }

            for (const unit of this.units) {
                if (!unit.alive) continue;
                const stat = UNITS[unit.kind];
                unit.atk -= dt;
                const target = this.findTarget(unit, stat);
                if (target) {
                    const d = Math.hypot(target.x - unit.x, target.y - unit.y);
                    if (d <= stat.range + (target.radius || 14)) {
                        if (unit.atk <= 0) {
                            if (stat.projectileSpeed) {
                                this.projectiles.push({
                                    x: unit.x,
                                    y: unit.y,
                                    team: unit.team,
                                    target,
                                    speed: stat.projectileSpeed,
                                    dmg: stat.dmg,
                                    splash: stat.splash || 0,
                                    color: stat.color
                                });
                            } else {
                                this.hit(target, stat.dmg);
                            }
                            unit.atk = stat.cooldown;
                        }
                    } else {
                        const v = unit.team === 'player' ? 1 : -1;
                        unit.x += v * stat.speed * dt;
                    }
                } else {
                    const v = unit.team === 'player' ? 1 : -1;
                    unit.x += v * stat.speed * dt;
                }
                unit.y += (LANES[unit.lane] - unit.y) * dt * 4;
            }

            for (const p of this.projectiles) {
                if (!p.target || !p.target.alive) {
                    p.dead = true;
                    continue;
                }
                const dx = p.target.x - p.x;
                const dy = p.target.y - p.y;
                const d = Math.hypot(dx, dy);
                if (d < p.speed * dt + 8) {
                    if (p.splash > 0) {
                        for (const enemy of this.enemyActors(p.team)) {
                            if (Math.hypot(enemy.x - p.target.x, enemy.y - p.target.y) <= p.splash) this.hit(enemy, p.dmg);
                        }
                    } else {
                        this.hit(p.target, p.dmg);
                    }
                    p.dead = true;
                } else {
                    p.x += (dx / d) * p.speed * dt;
                    p.y += (dy / d) * p.speed * dt;
                }
            }

            this.units = this.units.filter((u) => u.alive && u.x > 30 && u.x < WIDTH - 30);
            this.projectiles = this.projectiles.filter((p) => !p.dead);

            // score and end
            for (const t of this.towers) {
                if (t.alive || t.scored) continue;
                if (t.kind === 'princess') {
                    if (t.team === 'player') this.botCrown += 1;
                    else this.playerCrown += 1;
                }
                t.scored = true;
            }
            const playerKing = this.towers.find((t) => t.team === 'player' && t.kind === 'king');
            const botKing = this.towers.find((t) => t.team === 'bot' && t.kind === 'king');
            if (!playerKing.alive || !botKing.alive || this.timeLeft <= 0) {
                this.gameOver = true;
                if (!playerKing.alive) this.message = 'Defeat';
                else if (!botKing.alive) this.message = 'Victory!';
                else if (this.playerCrown > this.botCrown) this.message = 'Victory!';
                else if (this.playerCrown < this.botCrown) this.message = 'Defeat';
                else this.message = 'Draw';
            }

            this.syncHud();
        }

        findTarget(unit, stat) {
            const enemies = this.enemyActors(unit.team).filter((e) => Math.abs(e.y - unit.y) < 75);
            if (!enemies.length) return null;
            const filtered = stat.towerOnly ? enemies.filter((e) => e.kind) : enemies;
            const bucket = filtered.length ? filtered : enemies;
            return bucket.reduce((best, e) => (Math.abs(e.x - unit.x) < Math.abs(best.x - unit.x) ? e : best));
        }

        enemyActors(team) {
            return [
                ...this.units.filter((u) => u.team !== team && u.alive),
                ...this.towers.filter((t) => t.team !== team && t.alive).map((t) => ({ ...t, radius: 16 }))
            ];
        }

        nearestEnemyUnit(team, x, y, range) {
            const arr = this.units.filter((u) => u.team !== team && u.alive);
            let best = null;
            let bestD = Infinity;
            for (const u of arr) {
                const d = Math.hypot(u.x - x, u.y - y);
                if (d < range && d < bestD) {
                    best = u;
                    bestD = d;
                }
            }
            return best;
        }

        hit(target, dmg) {
            target.hp -= dmg;
            if (target.hp <= 0) target.alive = false;
            if (target.kind) {
                const real = this.towers.find((t) => t.team === target.team && t.kind === target.kind && Math.abs(t.x - target.x) < 3 && Math.abs(t.y - target.y) < 3);
                if (real) {
                    real.hp = target.hp;
                    real.alive = target.alive;
                }
            }
        }

        botTurn(skill) {
            const lanes = [0, 1, 2].map((lane) => {
                const p = this.units.filter((u) => u.team === 'player' && u.lane === lane).reduce((s, u) => s + u.hp, 0);
                const b = this.units.filter((u) => u.team === 'bot' && u.lane === lane).reduce((s, u) => s + u.hp, 0);
                return { lane, score: p - b + (Math.random() * 70 - 35) };
            });
            lanes.sort((a, b) => b.score - a.score);
            const lane = lanes[0].lane;

            const pool = ['knight', 'archer', 'bomber'];
            if (Math.random() < 0.45 * skill) pool.push('wizard');
            if (Math.random() < 0.35 * skill) pool.push('giant');
            const kind = pool[Math.floor(Math.random() * pool.length)];
            if (this.spawn(kind, 'bot', lane) && Math.random() < 0.34 * skill) {
                this.spawn('knight', 'bot', Math.random() < 0.7 ? lane : Math.floor(Math.random() * 3));
            }
        }

        draw() {
            const level = LEVELS[this.level];
            const ctx = this.ctx;
            ctx.clearRect(0, 0, WIDTH, HEIGHT);

            ctx.fillStyle = level.bg;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = level.field;
            ctx.fillRect(0, 70, WIDTH, HEIGHT - 130);

            ctx.fillStyle = level.river;
            ctx.fillRect(WIDTH / 2 - 56, 70, 112, HEIGHT - 130);
            ctx.fillStyle = level.bridge;
            LANES.forEach((y) => ctx.fillRect(WIDTH / 2 - 64, y - 22, 128, 44));

            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            LANES.forEach((y) => {
                ctx.beginPath();
                ctx.moveTo(40, y);
                ctx.lineTo(WIDTH - 40, y);
                ctx.stroke();
            });

            for (const tower of this.towers) {
                if (!tower.alive) continue;
                ctx.fillStyle = tower.team === 'player' ? '#486ec9' : '#d45d68';
                ctx.fillRect(tower.x - 18, tower.y - 20, 36, 40);
                this.drawHp(tower.x - 24, tower.y - 30, 48, tower.hp, tower.maxHp);
            }

            for (const u of this.units) {
                const stat = UNITS[u.kind];
                ctx.fillStyle = stat.color;
                ctx.beginPath();
                ctx.arc(u.x, u.y, stat.radius, 0, Math.PI * 2);
                ctx.fill();
                this.drawHp(u.x - 14, u.y - 18, 28, u.hp, u.maxHp);
            }

            for (const p of this.projectiles) {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            if (this.gameOver) {
                ctx.fillStyle = 'rgba(13,21,33,0.5)';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 44px Arial';
                ctx.fillText(this.message, WIDTH / 2 - 90, HEIGHT / 2);
                ctx.font = '20px Arial';
                ctx.fillText('Press Restart to play again or Next Level to continue', WIDTH / 2 - 220, HEIGHT / 2 + 36);
            }
        }

        drawHp(x, y, w, hp, maxHp) {
            const ctx = this.ctx;
            const ratio = Math.max(0, hp / maxHp);
            ctx.fillStyle = '#28374e';
            ctx.fillRect(x, y, w, 4);
            ctx.fillStyle = '#53d698';
            ctx.fillRect(x, y, w * ratio, 4);
        }

        syncHud() {
            const mins = String(Math.floor(this.timeLeft / 60)).padStart(1, '0');
            const secs = String(Math.floor(this.timeLeft % 60)).padStart(2, '0');
            const timer = document.getElementById('clash-timer');
            const score = document.getElementById('clash-score');
            const elixir = document.getElementById('clash-elixir');
            const status = document.getElementById('clash-status');
            if (timer) timer.textContent = `${mins}:${secs}`;
            if (score) score.textContent = `👑 ${this.playerCrown} - ${this.botCrown}`;
            if (elixir) elixir.textContent = `Elixir ${this.playerElixir.toFixed(1)} / 10`;
            if (status) status.textContent = this.gameOver ? this.message : `Level ${this.level + 1}: ${LEVELS[this.level].name}`;
        }
    }

    let game = null;

    function bindControls() {
        document.querySelectorAll('[data-clash-card]').forEach((btn) => {
            btn.onclick = () => {
                document.querySelectorAll('[data-clash-card]').forEach((n) => n.classList.remove('active'));
                btn.classList.add('active');
                if (game) game.selected = btn.dataset.clashCard;
            };
        });

        document.querySelectorAll('[data-clash-lane]').forEach((btn) => {
            btn.onclick = () => {
                if (!game) return;
                game.selectedLane = Number(btn.dataset.clashLane);
                document.querySelectorAll('[data-clash-lane]').forEach((n) => n.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        const spawn = document.getElementById('clash-spawn');
        const restart = document.getElementById('clash-restart');
        const next = document.getElementById('clash-next-level');

        if (spawn) {
            spawn.onclick = () => {
                if (!game || game.gameOver) return;
                const ok = game.spawn(game.selected, 'player', game.selectedLane);
                const status = document.getElementById('clash-status');
                if (status && !ok) status.textContent = 'Not enough elixir for selected unit.';
            };
        }

        if (restart) {
            restart.onclick = () => {
                if (!game) return;
                game.reset();
                game.start();
            };
        }

        if (next) {
            next.onclick = () => {
                if (!game) return;
                game.level = (game.level + 1) % LEVELS.length;
                game.reset();
                game.start();
            };
        }
    }

    function initClash() {
        if (!game) {
            game = new ClashBrowserGame();
            bindControls();
        }
        game.start();
        game.syncHud();
    }

    window.initClash = initClash;
})();
