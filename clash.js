// Vertical Clash-style browser arena with generated placeholder assets.

(() => {
    const CANVAS_WIDTH = 380;
    const CANVAS_HEIGHT = 560;
    const BRIDGE_Y = CANVAS_HEIGHT / 2;
    const LANES_X = [82, 190, 298];
    const FPS_DT_CAP = 1 / 25;
    const TOWER_DAMAGE_MULTIPLIER = 1.45;

    const TEAM_PLAYER = 'player';
    const TEAM_BOT = 'bot';

    const LEVELS = [
        { name: 'Emerald Keep', duration: 180, elixirRegen: 0.84, botBonus: 0.12, botSkill: 0.92, palette: { sky: '#eaf4ff', fieldA: '#cbe7cf', fieldB: '#c2dfc7', river: '#8fc6f2', bridge: '#9b795e', lane: 'rgba(255,255,255,0.26)' } },
        { name: 'Sunfire Bastion', duration: 180, elixirRegen: 0.88, botBonus: 0.18, botSkill: 1.07, palette: { sky: '#fff0dc', fieldA: '#f3d2aa', fieldB: '#ebc494', river: '#90bfe9', bridge: '#916850', lane: 'rgba(255,255,255,0.24)' } },
        { name: 'Frost Crown', duration: 180, elixirRegen: 0.92, botBonus: 0.24, botSkill: 1.22, palette: { sky: '#ebf4ff', fieldA: '#d6e6f8', fieldB: '#cdddf2', river: '#85b7ea', bridge: '#6e88a3', lane: 'rgba(255,255,255,0.3)' } }
    ];

    const UNITS = {
        knight: { emoji: '⚔️', cost: 3, hp: 420, speed: 74, damage: 54, cooldown: 0.84, range: 18, radius: 12, color: '#4d7bde', projectileSpeed: 0, splash: 0, towerFocus: false, healPower: 0, bombDamage: 0 },
        archer: { emoji: '🏹', cost: 3, hp: 230, speed: 66, damage: 34, cooldown: 0.95, range: 150, radius: 11, color: '#44ba84', projectileSpeed: 290, splash: 0, towerFocus: false, healPower: 0, bombDamage: 0 },
        giant: { emoji: '🛡️', cost: 5, hp: 960, speed: 52, damage: 88, cooldown: 1.15, range: 20, radius: 17, color: '#e09a4f', projectileSpeed: 0, splash: 0, towerFocus: true, healPower: 0, bombDamage: 0 },
        wizard: { emoji: '🧙', cost: 4, hp: 320, speed: 63, damage: 43, cooldown: 1, range: 132, radius: 12, color: '#9d6bf8', projectileSpeed: 255, splash: 48, towerFocus: false, healPower: 0, bombDamage: 0 },
        bomber: { emoji: '💣', cost: 3, hp: 250, speed: 66, damage: 0, cooldown: 0.15, range: 16, radius: 11, color: '#ff7584', projectileSpeed: 0, splash: 64, towerFocus: false, healPower: 0, bombDamage: 140 },
        healer: { emoji: '💚', cost: 4, hp: 280, speed: 62, damage: 0, cooldown: 0.8, range: 125, radius: 11, color: '#e4c15d', projectileSpeed: 220, splash: 0, towerFocus: false, healPower: 62, bombDamage: 0 }
    };

    const TOWER_TEMPLATE = {
        princess: { hp: 1800, damage: 52, range: 210, cooldown: 0.88, projectileSpeed: 330, width: 36, height: 38 },
        king: { hp: 3000, damage: 90, range: 235, cooldown: 0.9, projectileSpeed: 350, width: 42, height: 42 }
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function buildPlaceholderAssets() {
        const assets = { units: {}, towers: {}, patterns: {}, projectiles: {} };
        const grass = makeCanvas(64, 64);
        const gctx = grass.getContext('2d');
        gctx.fillStyle = '#a9d7a2';
        gctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 36; i += 1) {
            gctx.fillStyle = i % 2 ? '#90c989' : '#bbe7b4';
            gctx.beginPath();
            gctx.arc(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 4, 0, Math.PI * 2);
            gctx.fill();
        }
        assets.patterns.grass = grass;

        const water = makeCanvas(80, 80);
        const wctx = water.getContext('2d');
        wctx.fillStyle = '#78b6ea';
        wctx.fillRect(0, 0, 80, 80);
        wctx.strokeStyle = 'rgba(255,255,255,0.28)';
        wctx.lineWidth = 2;
        for (let y = 8; y < 80; y += 14) {
            wctx.beginPath();
            wctx.moveTo(0, y + Math.sin(y) * 2);
            wctx.bezierCurveTo(20, y - 4, 60, y + 5, 80, y);
            wctx.stroke();
        }
        assets.patterns.water = water;

        Object.entries(UNITS).forEach(([id, data]) => {
            const size = 44;
            const c = makeCanvas(size, size);
            const ctx = c.getContext('2d');
            const grad = ctx.createRadialGradient(size / 2, size / 2 - 6, 6, size / 2, size / 2, size / 2);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, data.color);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(19,31,53,0.36)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = '17px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(data.emoji, size / 2, size / 2 + 1);
            assets.units[id] = c;
        });

        ['player', 'bot'].forEach((team) => {
            ['princess', 'king'].forEach((kind) => {
                const w = kind === 'king' ? 64 : 56;
                const h = kind === 'king' ? 78 : 68;
                const c = makeCanvas(w, h);
                const ctx = c.getContext('2d');
                const body = team === 'player' ? '#4c76d5' : '#d9656f';
                const roof = team === 'player' ? '#7ea2f2' : '#f38d97';
                ctx.fillStyle = 'rgba(22,35,62,0.18)';
                ctx.beginPath();
                ctx.ellipse(w / 2, h - 9, w / 2 - 9, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = body;
                ctx.beginPath();
                ctx.roundRect(10, 18, w - 20, h - 28, 12);
                ctx.fill();
                ctx.fillStyle = roof;
                ctx.beginPath();
                ctx.roundRect(16, 5, w - 32, 18, 8);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = '16px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(kind === 'king' ? '👑' : '🏰', w / 2, h / 2 + 2);
                assets.towers[`${team}-${kind}`] = c;
            });
        });

        ['player', 'bot', 'unit'].forEach((k) => {
            const c = makeCanvas(12, 12);
            const ctx = c.getContext('2d');
            const col = k === 'player' ? '#4e86ff' : k === 'bot' ? '#ff7782' : '#ffffff';
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(6, 6, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.stroke();
            assets.projectiles[k] = c;
        });

        return assets;
    }

    class ClashBrowserGame {
        constructor() {
            this.canvas = document.getElementById('clash-canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
            this.assets = buildPlaceholderAssets();
            this.units = [];
            this.towers = [];
            this.projectiles = [];
            this.levelIndex = 0;
            this.selectedCard = 'knight';
            this.running = false;
            this.lastTs = 0;
            this.stateVersion = '';
            this.resetMatch(true);
        }

        currentLevel() { return LEVELS[this.levelIndex]; }
        nearestLaneX(x) { return LANES_X.reduce((best, laneX) => Math.abs(laneX - x) < Math.abs(best - x) ? laneX : best, LANES_X[1]); }
        enemyKing(team) { return this.towers.find((t) => t.team !== team && t.kind === 'king' && t.alive); }
        enemyPrincessDown(team) { return this.towers.some((t) => t.team !== team && t.kind === 'princess' && !t.alive); }

        resetMatch(resetLevel = false) {
            if (resetLevel) this.levelIndex = clamp(this.levelIndex, 0, LEVELS.length - 1);
            const level = this.currentLevel();
            this.units = [];
            this.towers = [];
            this.projectiles = [];
            this.playerElixir = 5;
            this.botElixir = 5;
            this.maxElixir = 10;
            this.timeLeft = level.duration;
            this.playerCrown = 0;
            this.botCrown = 0;
            this.gameOver = false;
            this.winner = null;
            this.statusMessage = 'Pick a troop, then tap your side of arena to deploy.';
            this.botSpawnTimer = 0.9 + Math.random() * 1.1;
            this.botBurstCooldown = 0;
            this.spawnTowers();
            this.syncHud(true);
        }

        spawnTowers() {
            const createTower = (team, kind, x, y) => {
                const b = TOWER_TEMPLATE[kind];
                this.towers.push({
                    id: `${team}-${kind}-${Math.random().toString(36).slice(2, 8)}`,
                    team, kind, x, y,
                    hp: b.hp, maxHp: b.hp,
                    damage: b.damage,
                    cooldown: b.cooldown,
                    range: b.range,
                    projectileSpeed: b.projectileSpeed,
                    width: b.width,
                    height: b.height,
                    attackTimer: Math.random() * 0.35,
                    alive: true,
                    counted: false
                });
            };
            createTower(TEAM_BOT, 'princess', LANES_X[0], 80);
            createTower(TEAM_BOT, 'princess', LANES_X[2], 80);
            createTower(TEAM_BOT, 'king', LANES_X[1], 46);
            createTower(TEAM_PLAYER, 'princess', LANES_X[0], CANVAS_HEIGHT - 80);
            createTower(TEAM_PLAYER, 'princess', LANES_X[2], CANVAS_HEIGHT - 80);
            createTower(TEAM_PLAYER, 'king', LANES_X[1], CANVAS_HEIGHT - 46);
        }

        start() {
            if (!this.canvas || !this.ctx || this.running) return;
            this.running = true;
            this.lastTs = performance.now();
            requestAnimationFrame((ts) => this.loop(ts));
        }

        loop(ts) {
            if (!this.running) return;
            const dt = Math.min(FPS_DT_CAP, (ts - this.lastTs) / 1000);
            this.lastTs = ts;
            this.update(dt);
            this.draw();
            requestAnimationFrame((next) => this.loop(next));
        }

        deployFromBoard(cardId, x, y) {
            if (this.gameOver) return false;
            if (y < BRIDGE_Y + 12 || y > CANVAS_HEIGHT - 10) {
                this.statusMessage = 'Deploy on your side: tap below the bridge.';
                return false;
            }
            const data = UNITS[cardId];
            if (!data) return false;
            if (this.playerElixir < data.cost) {
                this.statusMessage = `Need ${data.cost} elixir for ${data.emoji}.`;
                return false;
            }
            this.playerElixir -= data.cost;
            this.spawnUnit(cardId, TEAM_PLAYER, x, y);
            this.statusMessage = `${data.emoji} deployed.`;
            this.syncHud(true);
            return true;
        }

        spawnUnit(cardId, team, x, y) {
            const d = UNITS[cardId];
            this.units.push({
                id: `${team}-${cardId}-${Math.random().toString(36).slice(2, 9)}`,
                team,
                cardId,
                x,
                y,
                routeX: this.nearestLaneX(x),
                hp: d.hp,
                maxHp: d.hp,
                attackTimer: Math.random() * d.cooldown,
                alive: true
            });
        }

        update(dt) {
            if (this.gameOver) { this.syncHud(); return; }
            const level = this.currentLevel();
            this.timeLeft = Math.max(0, this.timeLeft - dt);
            const fast = this.timeLeft <= 60 ? 1.34 : 1;
            this.playerElixir = clamp(this.playerElixir + level.elixirRegen * fast * dt, 0, this.maxElixir);
            this.botElixir = clamp(this.botElixir + (level.elixirRegen + level.botBonus) * fast * dt, 0, this.maxElixir);
            this.updateBot(dt, level);
            this.updateTowers(dt);
            this.updateUnits(dt);
            this.updateProjectiles(dt);
            this.cleanup();
            this.evaluateGameOver();
            this.syncHud();
        }

        updateBot(dt, level) {
            this.botSpawnTimer -= dt;
            this.botBurstCooldown = Math.max(0, this.botBurstCooldown - dt);
            if (this.botSpawnTimer > 0) return;

            const pool = ['knight', 'archer', 'bomber'];
            if (Math.random() < 0.42 * level.botSkill) pool.push('wizard');
            if (Math.random() < 0.35 * level.botSkill) pool.push('giant');
            if (Math.random() < 0.25 * level.botSkill) pool.push('healer');
            const cardId = pool[Math.floor(Math.random() * pool.length)];
            const data = UNITS[cardId];

            if (this.botElixir >= data.cost) {
                this.botElixir -= data.cost;
                this.spawnUnit(cardId, TEAM_BOT, 26 + Math.random() * (CANVAS_WIDTH - 52), 60 + Math.random() * 130);
                if (this.botBurstCooldown <= 0 && this.botElixir >= 3 && Math.random() < 0.38 * level.botSkill) {
                    const support = Math.random() < 0.5 ? 'knight' : 'archer';
                    if (this.botElixir >= UNITS[support].cost) {
                        this.botElixir -= UNITS[support].cost;
                        this.spawnUnit(support, TEAM_BOT, 26 + Math.random() * (CANVAS_WIDTH - 52), 64 + Math.random() * 120);
                        this.botBurstCooldown = 2.1;
                    }
                }
            }
            this.botSpawnTimer = 0.85 + Math.random() * (1.05 / level.botSkill);
        }

        updateTowers(dt) {
            for (const tower of this.towers) {
                if (!tower.alive) continue;
                tower.attackTimer -= dt;
                if (tower.attackTimer > 0) continue;
                const enemies = this.units.filter((u) => u.alive && u.team !== tower.team);
                let target = null;
                let best = Infinity;
                for (const u of enemies) {
                    const dist = distance(tower.x, tower.y, u.x, u.y);
                    if (dist <= tower.range && dist < best) { target = u; best = dist; }
                }
                if (!target) continue;
                this.projectiles.push({ id: `tower-${Math.random().toString(36).slice(2, 8)}`, team: tower.team, x: tower.x, y: tower.y, speed: tower.projectileSpeed, damage: tower.damage, splash: 0, healPower: 0, targetId: target.id, color: tower.team === TEAM_PLAYER ? '#4e86ff' : '#ff7782', alive: true });
                tower.attackTimer = tower.cooldown;
            }
        }

        updateUnits(dt) {
            for (const unit of this.units) {
                if (!unit.alive) continue;
                const d = UNITS[unit.cardId];
                unit.attackTimer -= dt;
                if (this.enemyPrincessDown(unit.team)) {
                    const king = this.enemyKing(unit.team);
                    if (king) unit.routeX = king.x;
                }

                if (unit.cardId === 'healer') {
                    const ally = this.pickHealTarget(unit, d);
                    if (ally) {
                        const distToAlly = distance(unit.x, unit.y, ally.x, ally.y);
                        if (distToAlly <= d.range) {
                            if (unit.attackTimer <= 0) {
                                this.heal(ally, d.healPower);
                                unit.attackTimer = d.cooldown;
                            }
                        } else {
                            unit.x += (ally.x - unit.x) * dt * 1.9;
                            unit.y += (ally.y - unit.y) * dt * 1.9;
                        }
                        continue;
                    }
                }

                const target = this.pickTarget(unit, d);
                if (target) {
                    const dist = distance(unit.x, unit.y, target.x, target.y);
                    if (dist <= d.range + (target.radius || target.width || 16) * 0.56) {
                        if (unit.attackTimer <= 0) {
                            this.performAttack(unit, d, target);
                            unit.attackTimer = d.cooldown;
                        }
                        continue;
                    }
                }

                const direction = unit.team === TEAM_PLAYER ? -1 : 1;
                const speed = d.speed * (Math.abs(unit.y - BRIDGE_Y) < 44 ? 0.86 : 1);
                unit.y += direction * speed * dt;
                unit.x += (unit.routeX - unit.x) * dt * 4.1;
            }
        }

        pickHealTarget(unit, data) {
            const allies = [...this.units.filter((u) => u.alive && u.team === unit.team), ...this.towers.filter((t) => t.alive && t.team === unit.team)]
                .filter((a) => a.id !== unit.id && a.hp < a.maxHp * 0.97)
                .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
            if (!allies.length) return null;
            return allies[0];
        }

        pickTarget(unit, data) {
            const crossedBridge = unit.team === TEAM_PLAYER ? unit.y <= BRIDGE_Y - 2 : unit.y >= BRIDGE_Y + 2;
            const enemyUnits = this.units.filter((u) => u.alive && u.team !== unit.team).map((u) => ({ ...u, radius: UNITS[u.cardId].radius }))
                .filter((e) => Math.abs(e.y - unit.y) < data.range + 76 && Math.abs(e.x - unit.x) < 68);
            if (crossedBridge && enemyUnits.length) {
                return enemyUnits.reduce((best, e) => distance(e.x, e.y, unit.x, unit.y) < distance(best.x, best.y, unit.x, unit.y) ? e : best);
            }

            const enemyTowers = this.towers.filter((t) => t.alive && t.team !== unit.team).map((t) => ({ ...t, radius: 18 }))
                .filter((e) => Math.abs(e.y - unit.y) < data.range + 76 && Math.abs(e.x - unit.x) < 68);
            let pool = [...enemyUnits, ...enemyTowers];
            if (data.towerFocus && !crossedBridge) {
                const towersOnly = pool.filter((p) => p.kind);
                if (towersOnly.length) pool = towersOnly;
            }
            return pool.length ? pool.reduce((best, e) => distance(e.x, e.y, unit.x, unit.y) < distance(best.x, best.y, unit.x, unit.y) ? e : best) : null;
        }

        performAttack(unit, data, target) {
            const isTower = Boolean(target.kind);
            const towerBoost = isTower ? TOWER_DAMAGE_MULTIPLIER : 1;

            if (unit.cardId === 'bomber') {
                // contact explosive unit
                const blast = data.bombDamage * towerBoost;
                for (const e of this.getEnemies(unit.team)) {
                    if (e.alive && distance(e.x, e.y, target.x, target.y) <= data.splash) this.damage(e, blast);
                }
                unit.alive = false;
                return;
            }

            if (data.projectileSpeed > 0) {
                this.projectiles.push({ id: `unit-${Math.random().toString(36).slice(2, 8)}`, team: unit.team, x: unit.x, y: unit.y, speed: data.projectileSpeed, damage: data.damage * towerBoost, splash: data.splash, healPower: data.healPower, targetId: target.id, color: data.color, alive: true });
                return;
            }
            if (data.healPower > 0) {
                this.heal(target, data.healPower);
                return;
            }
            if (data.splash > 0) {
                for (const e of this.getEnemies(unit.team)) if (e.alive && distance(e.x, e.y, target.x, target.y) <= data.splash) this.damage(e, data.damage * towerBoost);
            } else {
                this.damage(target, data.damage * towerBoost);
            }
        }

        getEnemies(team) { return [...this.units.filter((u) => u.alive && u.team !== team), ...this.towers.filter((t) => t.alive && t.team !== team)]; }

        updateProjectiles(dt) {
            for (const p of this.projectiles) {
                if (!p.alive) continue;
                const target = this.findActor(p.targetId);
                if (!target || !target.alive) { p.alive = false; continue; }
                const dx = target.x - p.x;
                const dy = target.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= p.speed * dt + 5) {
                    if (p.healPower > 0) this.heal(target, p.healPower);
                    else if (p.splash > 0) {
                        for (const e of this.getEnemies(p.team)) if (e.alive && distance(e.x, e.y, target.x, target.y) <= p.splash) this.damage(e, p.damage);
                    } else this.damage(target, p.damage);
                    p.alive = false;
                } else {
                    p.x += (dx / dist) * p.speed * dt;
                    p.y += (dy / dist) * p.speed * dt;
                }
            }
        }

        findActor(id) { return this.units.find((u) => u.id === id && u.alive) || this.towers.find((t) => t.id === id && t.alive) || null; }
        damage(actor, amount) { actor.hp -= amount; if (actor.hp <= 0) { actor.hp = 0; actor.alive = false; } }
        heal(actor, amount) { actor.hp = Math.min(actor.maxHp, actor.hp + amount); }

        cleanup() {
            this.units = this.units.filter((u) => u.alive && u.y >= -30 && u.y <= CANVAS_HEIGHT + 30);
            this.projectiles = this.projectiles.filter((p) => p.alive);
            for (const t of this.towers) {
                if (t.alive || t.counted) continue;
                if (t.kind === 'princess') {
                    if (t.team === TEAM_PLAYER) this.botCrown += 1;
                    else this.playerCrown += 1;
                }
                t.counted = true;
            }
        }

        evaluateGameOver() {
            const playerKing = this.towers.find((t) => t.team === TEAM_PLAYER && t.kind === 'king');
            const botKing = this.towers.find((t) => t.team === TEAM_BOT && t.kind === 'king');
            if (!playerKing?.alive) { this.gameOver = true; this.winner = TEAM_BOT; this.statusMessage = 'Defeat — your King Tower was destroyed.'; return; }
            if (!botKing?.alive) { this.gameOver = true; this.winner = TEAM_PLAYER; this.statusMessage = 'Victory — enemy King Tower destroyed!'; return; }
            if (this.timeLeft > 0) return;
            this.gameOver = true;
            if (this.playerCrown > this.botCrown) { this.winner = TEAM_PLAYER; this.statusMessage = 'Victory on crowns!'; }
            else if (this.botCrown > this.playerCrown) { this.winner = TEAM_BOT; this.statusMessage = 'Defeat on crowns.'; }
            else if (playerKing.hp > botKing.hp) { this.winner = TEAM_PLAYER; this.statusMessage = 'Victory on tiebreaker king HP!'; }
            else if (botKing.hp > playerKing.hp) { this.winner = TEAM_BOT; this.statusMessage = 'Defeat on tiebreaker king HP.'; }
            else { this.winner = 'draw'; this.statusMessage = 'Draw — dead even.'; }
        }

        draw() {
            const ctx = this.ctx;
            if (!ctx) return;
            const p = this.currentLevel().palette;
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            sky.addColorStop(0, p.sky);
            sky.addColorStop(1, '#f9fbff');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillRect(8, 8, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16);
            ctx.strokeStyle = 'rgba(71,93,144,0.28)';
            ctx.lineWidth = 2;
            ctx.strokeRect(8, 8, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16);

            const grassPattern = ctx.createPattern(this.assets.patterns.grass, 'repeat');
            if (grassPattern) {
                ctx.fillStyle = grassPattern;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(16, 14, CANVAS_WIDTH - 32, CANVAS_HEIGHT - 28);
                ctx.globalAlpha = 1;
            }
            ctx.fillStyle = p.fieldA;
            ctx.fillRect(16, 14, CANVAS_WIDTH - 32, CANVAS_HEIGHT - 28);
            ctx.fillStyle = p.fieldB;
            ctx.fillRect(16, 14, CANVAS_WIDTH - 32, (CANVAS_HEIGHT - 28) / 2);

            this.drawArenaOrnaments(ctx, p);
            this.drawDeploymentHint(ctx);
            this.drawTowers(ctx);
            this.drawUnits(ctx);
            this.drawProjectiles(ctx);
            this.drawTopOverlay(ctx);
            if (this.gameOver) this.drawEndOverlay(ctx);
        }

        drawArenaOrnaments(ctx, p) {
            const waterPattern = ctx.createPattern(this.assets.patterns.water, 'repeat');
            ctx.fillStyle = waterPattern || p.river;
            ctx.fillRect(16, BRIDGE_Y - 22, CANVAS_WIDTH - 32, 44);
            ctx.fillStyle = p.bridge;
            for (const x of LANES_X) ctx.fillRect(x - 22, BRIDGE_Y - 28, 44, 56);
            ctx.strokeStyle = p.lane;
            ctx.lineWidth = 1.5;
            for (const x of LANES_X) {
                ctx.beginPath();
                ctx.moveTo(x, 20);
                ctx.lineTo(x, CANVAS_HEIGHT - 20);
                ctx.stroke();
            }
        }

        drawDeploymentHint(ctx) {
            if (this.gameOver) return;
            ctx.fillStyle = 'rgba(80, 105, 170, 0.12)';
            ctx.fillRect(16, BRIDGE_Y + 20, CANVAS_WIDTH - 32, CANVAS_HEIGHT - BRIDGE_Y - 30);
            ctx.fillStyle = 'rgba(28,46,84,0.75)';
            ctx.font = '11px Inter, Arial, sans-serif';
            ctx.fillText('Tap below river to deploy', 124, BRIDGE_Y + 36);
        }

        drawTowers(ctx) {
            for (const t of this.towers) {
                if (!t.alive) continue;
                const sprite = this.assets.towers[`${t.team}-${t.kind}`];
                if (sprite) ctx.drawImage(sprite, t.x - sprite.width / 2, t.y - sprite.height / 2);
                this.drawHealthBar(ctx, t.x - 21, t.y - t.height / 2 - 14, 42, 5, t.hp, t.maxHp);
            }
        }

        drawUnits(ctx) {
            for (const u of this.units) {
                if (!u.alive) continue;
                const d = UNITS[u.cardId];
                const sprite = this.assets.units[u.cardId];
                if (sprite) ctx.drawImage(sprite, u.x - sprite.width / 2, u.y - sprite.height / 2);
                this.drawHealthBar(ctx, u.x - 15, u.y - d.radius - 10, 30, 4, u.hp, u.maxHp);
            }
        }

        drawProjectiles(ctx) {
            for (const p of this.projectiles) {
                if (!p.alive) continue;
                const key = p.team === TEAM_PLAYER ? 'player' : p.team === TEAM_BOT ? 'bot' : 'unit';
                const sprite = this.assets.projectiles[key];
                if (sprite) ctx.drawImage(sprite, p.x - sprite.width / 2, p.y - sprite.height / 2);
            }
        }

        drawTopOverlay(ctx) {
            const pk = this.towers.find((t) => t.team === TEAM_PLAYER && t.kind === 'king');
            const bk = this.towers.find((t) => t.team === TEAM_BOT && t.kind === 'king');
            if (!pk || !bk) return;
            ctx.fillStyle = 'rgba(16, 28, 42, 0.55)';
            ctx.fillRect(18, 8, CANVAS_WIDTH - 36, 20);
            this.drawText(ctx, `Bot 👑 ${Math.ceil(bk.hp)}`, 54, 22, '#e2eeff', 11);
            this.drawText(ctx, `You 👑 ${Math.ceil(pk.hp)}`, CANVAS_WIDTH - 136, 22, '#e2eeff', 11);
            this.drawText(ctx, `${UNITS[this.selectedCard].emoji}`, CANVAS_WIDTH / 2, 22, '#fff', 12, true);
        }

        drawEndOverlay(ctx) {
            ctx.fillStyle = 'rgba(7, 16, 26, 0.65)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const title = this.winner === TEAM_PLAYER ? 'Victory!' : this.winner === TEAM_BOT ? 'Defeat' : 'Draw';
            this.drawText(ctx, title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, '#fff', 36, true);
            this.drawText(ctx, `Final crowns: ${this.playerCrown} : ${this.botCrown}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 8, '#f4f8ff', 15, true);
            this.drawText(ctx, 'Tap Restart or Next Arena', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30, '#d2e0f5', 12, true);
        }

        drawHealthBar(ctx, x, y, w, h, hp, maxHp) {
            const ratio = clamp(hp / maxHp, 0, 1);
            ctx.fillStyle = 'rgba(13, 23, 35, 0.8)';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = '#48cf92';
            ctx.fillRect(x, y, w * ratio, h);
        }

        drawText(ctx, text, x, y, color = '#fff', size = 14, centered = false) {
            ctx.fillStyle = color;
            ctx.font = `${size}px Inter, Arial, sans-serif`;
            if (centered) {
                const m = ctx.measureText(text);
                ctx.fillText(text, x - m.width / 2, y);
            } else ctx.fillText(text, x, y);
        }

        syncHud(force = false) {
            const version = [Math.round(this.timeLeft * 10), Math.round(this.playerElixir * 10), Math.round(this.botElixir * 10), this.playerCrown, this.botCrown, this.statusMessage].join('|');
            if (!force && version === this.stateVersion) return;
            this.stateVersion = version;

            const mins = Math.floor(this.timeLeft / 60);
            const secs = Math.floor(this.timeLeft % 60);
            const timer = document.getElementById('clash-timer');
            const score = document.getElementById('clash-score');
            const pE = document.getElementById('clash-player-elixir');
            const bE = document.getElementById('clash-bot-elixir');
            const inline = document.getElementById('clash-player-elixir-inline');
            const status = document.getElementById('clash-status');
            const sub = document.getElementById('clash-substatus');
            const msg = document.getElementById('clash-message');
            if (timer) timer.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
            if (score) score.textContent = `👑 ${this.playerCrown} : ${this.botCrown} 👑`;
            if (pE) pE.textContent = `Elixir ${this.playerElixir.toFixed(1)}`;
            if (bE) bE.textContent = `Elixir ${this.botElixir.toFixed(1)}`;
            if (inline) inline.textContent = `⚡ ${this.playerElixir.toFixed(1)}`;
            if (status) status.textContent = `Arena ${this.levelIndex + 1} · ${this.currentLevel().name}`;
            if (sub) sub.textContent = this.gameOver ? this.statusMessage : 'Tap a troop emoji, then tap below the river.';
            if (msg) msg.textContent = this.statusMessage;
        }
    }

    let game = null;

    function setActiveCard(cardId) {
        document.querySelectorAll('[data-clash-card]').forEach((el) => {
            el.classList.toggle('active', el.dataset.clashCard === cardId);
        });
    }

    function canvasPoint(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        const cx = event.touches ? event.touches[0].clientX : event.clientX;
        const cy = event.touches ? event.touches[0].clientY : event.clientY;
        return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
    }

    function bindControls() {
        document.querySelectorAll('[data-clash-card]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!game) return;
                game.selectedCard = button.dataset.clashCard;
                setActiveCard(game.selectedCard);
                game.statusMessage = `${UNITS[game.selectedCard].emoji} selected.`;
                game.syncHud(true);
            });
        });

        const canvas = document.getElementById('clash-canvas');
        if (canvas) {
            const handler = (event) => {
                if (!game) return;
                if (event.cancelable) event.preventDefault();
                const point = canvasPoint(event, canvas);
                game.deployFromBoard(game.selectedCard, point.x, point.y);
            };
            canvas.addEventListener('click', handler);
            canvas.addEventListener('touchstart', handler, { passive: false });
        }

        const restart = document.getElementById('clash-restart');
        if (restart) restart.addEventListener('click', () => {
            if (!game) return;
            game.resetMatch();
            game.start();
        });

        const next = document.getElementById('clash-next-level');
        if (next) next.addEventListener('click', () => {
            if (!game) return;
            game.levelIndex = (game.levelIndex + 1) % LEVELS.length;
            game.resetMatch();
            game.start();
        });
    }

    function initClash(forceReset = false) {
        if (!game) {
            game = new ClashBrowserGame();
            bindControls();
        } else if (forceReset) {
            game.resetMatch();
        }

        game.start();
        game.syncHud(true);
        setActiveCard(game.selectedCard);
    }

    window.initClash = initClash;
})();
