// Vertical Clash-style browser arena with tap-to-deploy controls.

(() => {
    const CANVAS_WIDTH = 420;
    const CANVAS_HEIGHT = 760;
    const BRIDGE_Y = CANVAS_HEIGHT / 2;
    const LANES_X = [95, 210, 325];
    const FPS_DT_CAP = 1 / 25;

    const TEAM_PLAYER = 'player';
    const TEAM_BOT = 'bot';

    const LEVELS = [
        {
            name: 'Emerald Keep',
            duration: 180,
            elixirRegen: 0.84,
            botBonus: 0.12,
            botSkill: 0.92,
            palette: {
                sky: '#d8f6de',
                fieldA: '#bde6c8',
                fieldB: '#b2ddbf',
                river: '#8ec7fa',
                bridge: '#9b795e',
                lane: 'rgba(255,255,255,0.33)'
            }
        },
        {
            name: 'Sunfire Bastion',
            duration: 190,
            elixirRegen: 0.88,
            botBonus: 0.18,
            botSkill: 1.07,
            palette: {
                sky: '#ffe4c7',
                fieldA: '#f5cfa7',
                fieldB: '#eec292',
                river: '#8dbef1',
                bridge: '#916850',
                lane: 'rgba(255,255,255,0.3)'
            }
        },
        {
            name: 'Frost Crown',
            duration: 200,
            elixirRegen: 0.92,
            botBonus: 0.24,
            botSkill: 1.22,
            palette: {
                sky: '#dfeeff',
                fieldA: '#c7ddf6',
                fieldB: '#bdd4f0',
                river: '#81b3e8',
                bridge: '#6e88a3',
                lane: 'rgba(255,255,255,0.4)'
            }
        }
    ];

    const UNITS = {
        knight: { name: 'Knight', cost: 3, hp: 420, speed: 74, damage: 54, cooldown: 0.84, range: 18, radius: 12, color: '#4d7bde', projectileSpeed: 0, splash: 0, towerFocus: false, healPower: 0 },
        archer: { name: 'Archer', cost: 3, hp: 230, speed: 66, damage: 34, cooldown: 0.95, range: 150, radius: 11, color: '#44ba84', projectileSpeed: 290, splash: 0, towerFocus: false, healPower: 0 },
        giant: { name: 'Giant', cost: 5, hp: 960, speed: 52, damage: 88, cooldown: 1.15, range: 20, radius: 17, color: '#e09a4f', projectileSpeed: 0, splash: 0, towerFocus: true, healPower: 0 },
        wizard: { name: 'Wizard', cost: 4, hp: 320, speed: 63, damage: 43, cooldown: 1, range: 132, radius: 12, color: '#9d6bf8', projectileSpeed: 255, splash: 48, towerFocus: false, healPower: 0 },
        bomber: { name: 'Bomber', cost: 3, hp: 250, speed: 60, damage: 58, cooldown: 1.2, range: 118, radius: 11, color: '#ff7584', projectileSpeed: 240, splash: 64, towerFocus: false, healPower: 0 },
        healer: { name: 'Healer', cost: 4, hp: 280, speed: 70, damage: 0, cooldown: 0.9, range: 110, radius: 11, color: '#e4c15d', projectileSpeed: 220, splash: 0, towerFocus: false, healPower: 52 }
    };

    const TOWER_TEMPLATE = {
        princess: { hp: 1800, damage: 52, range: 210, cooldown: 0.88, projectileSpeed: 330, width: 38, height: 40 },
        king: { hp: 3000, damage: 90, range: 235, cooldown: 0.9, projectileSpeed: 350, width: 44, height: 46 }
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

    class ClashBrowserGame {
        constructor() {
            this.canvas = document.getElementById('clash-canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

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

        currentLevel() {
            return LEVELS[this.levelIndex];
        }

        nearestLaneX(x) {
            return LANES_X.reduce((best, laneX) => Math.abs(laneX - x) < Math.abs(best - x) ? laneX : best, LANES_X[1]);
        }

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
            this.botSpawnTimer = 1.0 + Math.random() * 1.1;
            this.botBurstCooldown = 0;

            this.spawnTowers();
            this.syncHud(true);
        }

        spawnTowers() {
            const createTower = (team, kind, x, y) => {
                const base = TOWER_TEMPLATE[kind];
                this.towers.push({
                    id: `${team}-${kind}-${Math.random().toString(36).slice(2, 8)}`,
                    team,
                    kind,
                    x,
                    y,
                    hp: base.hp,
                    maxHp: base.hp,
                    damage: base.damage,
                    cooldown: base.cooldown,
                    range: base.range,
                    projectileSpeed: base.projectileSpeed,
                    width: base.width,
                    height: base.height,
                    attackTimer: Math.random() * 0.35,
                    alive: true,
                    counted: false
                });
            };

            createTower(TEAM_BOT, 'princess', LANES_X[0], 92);
            createTower(TEAM_BOT, 'princess', LANES_X[2], 92);
            createTower(TEAM_BOT, 'king', LANES_X[1], 52);
            createTower(TEAM_PLAYER, 'princess', LANES_X[0], CANVAS_HEIGHT - 92);
            createTower(TEAM_PLAYER, 'princess', LANES_X[2], CANVAS_HEIGHT - 92);
            createTower(TEAM_PLAYER, 'king', LANES_X[1], CANVAS_HEIGHT - 52);
        }

        start() {
            if (!this.canvas || !this.ctx) return;
            if (this.running) return;
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
            requestAnimationFrame((nextTs) => this.loop(nextTs));
        }

        deployFromBoard(cardId, x, y) {
            if (this.gameOver) return false;
            if (y < BRIDGE_Y + 26 || y > CANVAS_HEIGHT - 100) {
                this.statusMessage = 'Deploy on your side: tap below the bridge.';
                return false;
            }
            const data = UNITS[cardId];
            if (!data) return false;
            if (this.playerElixir < data.cost) {
                this.statusMessage = `Need ${data.cost} elixir for ${data.name}.`;
                return false;
            }
            this.playerElixir -= data.cost;
            this.spawnUnit(cardId, TEAM_PLAYER, x, y);
            this.statusMessage = `${data.name} deployed.`;
            this.syncHud(true);
            return true;
        }

        spawnUnit(cardId, team, x, y) {
            const data = UNITS[cardId];
            const routeX = this.nearestLaneX(x);
            this.units.push({
                id: `${team}-${cardId}-${Math.random().toString(36).slice(2, 9)}`,
                team,
                cardId,
                x,
                y,
                routeX,
                hp: data.hp,
                maxHp: data.hp,
                attackTimer: Math.random() * data.cooldown,
                alive: true
            });
        }

        update(dt) {
            if (this.gameOver) {
                this.syncHud();
                return;
            }

            const level = this.currentLevel();
            this.timeLeft = Math.max(0, this.timeLeft - dt);
            const fastRegen = this.timeLeft <= 60 ? 1.34 : 1;
            this.playerElixir = clamp(this.playerElixir + level.elixirRegen * fastRegen * dt, 0, this.maxElixir);
            this.botElixir = clamp(this.botElixir + (level.elixirRegen + level.botBonus) * fastRegen * dt, 0, this.maxElixir);

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

            const laneScores = LANES_X.map((laneX) => {
                const p = this.units.filter((u) => u.team === TEAM_PLAYER && Math.abs(u.routeX - laneX) < 8).reduce((s, u) => s + u.hp, 0);
                const b = this.units.filter((u) => u.team === TEAM_BOT && Math.abs(u.routeX - laneX) < 8).reduce((s, u) => s + u.hp, 0);
                return { laneX, score: p - b + (Math.random() * 220 - 110) };
            });
            laneScores.sort((a, b) => b.score - a.score);

            const pool = ['knight', 'archer', 'bomber'];
            if (Math.random() < 0.42 * level.botSkill) pool.push('wizard');
            if (Math.random() < 0.35 * level.botSkill) pool.push('giant');
            if (Math.random() < 0.25 * level.botSkill) pool.push('healer');
            const cardId = pool[Math.floor(Math.random() * pool.length)];
            const data = UNITS[cardId];

            if (this.botElixir >= data.cost) {
                this.botElixir -= data.cost;
                this.spawnUnit(cardId, TEAM_BOT, laneScores[0].laneX + (Math.random() * 12 - 6), 120 + Math.random() * 24);
                if (this.botBurstCooldown <= 0 && this.botElixir >= 3 && Math.random() < 0.38 * level.botSkill) {
                    const supportCard = Math.random() < 0.5 ? 'knight' : 'archer';
                    if (this.botElixir >= UNITS[supportCard].cost) {
                        this.botElixir -= UNITS[supportCard].cost;
                        this.spawnUnit(supportCard, TEAM_BOT, laneScores[Math.floor(Math.random() * 2)].laneX, 120 + Math.random() * 20);
                        this.botBurstCooldown = 2.2;
                    }
                }
            }

            this.botSpawnTimer = 0.9 + Math.random() * (1.05 / level.botSkill);
        }

        updateTowers(dt) {
            for (const tower of this.towers) {
                if (!tower.alive) continue;
                tower.attackTimer -= dt;
                if (tower.attackTimer > 0) continue;

                const enemies = this.units.filter((u) => u.alive && u.team !== tower.team);
                let target = null;
                let best = Infinity;
                for (const unit of enemies) {
                    const d = distance(tower.x, tower.y, unit.x, unit.y);
                    if (d <= tower.range && d < best) {
                        target = unit;
                        best = d;
                    }
                }
                if (!target) continue;

                this.projectiles.push({
                    id: `tower-${Math.random().toString(36).slice(2, 8)}`,
                    team: tower.team,
                    x: tower.x,
                    y: tower.y,
                    speed: tower.projectileSpeed,
                    damage: tower.damage,
                    splash: 0,
                    healPower: 0,
                    targetId: target.id,
                    color: tower.team === TEAM_PLAYER ? '#4e86ff' : '#ff7782',
                    alive: true
                });
                tower.attackTimer = tower.cooldown;
            }
        }

        updateUnits(dt) {
            for (const unit of this.units) {
                if (!unit.alive) continue;
                const data = UNITS[unit.cardId];
                unit.attackTimer -= dt;

                const target = this.pickTarget(unit, data);
                if (target) {
                    const d = distance(unit.x, unit.y, target.x, target.y);
                    if (d <= data.range + (target.radius || target.width || 16) * 0.56) {
                        if (unit.attackTimer <= 0) {
                            this.performAttack(unit, data, target);
                            unit.attackTimer = data.cooldown;
                        }
                        continue;
                    }
                }

                const direction = unit.team === TEAM_PLAYER ? -1 : 1;
                const speed = data.speed * (Math.abs(unit.y - BRIDGE_Y) < 58 ? 0.86 : 1);
                unit.y += direction * speed * dt;
                unit.x += (unit.routeX - unit.x) * dt * 4.4;
            }
        }

        pickTarget(unit, data) {
            if (data.healPower > 0) {
                const allies = [
                    ...this.units.filter((u) => u.alive && u.team === unit.team),
                    ...this.towers.filter((t) => t.alive && t.team === unit.team)
                ].filter((a) => a.id !== unit.id && a.hp < a.maxHp * 0.94 && Math.abs(a.x - unit.x) < data.range + 30 && Math.abs(a.y - unit.y) < data.range + 30);
                if (!allies.length) return null;
                return allies.reduce((best, a) => (a.hp / a.maxHp < best.hp / best.maxHp ? a : best));
            }

            const enemies = [
                ...this.units.filter((u) => u.alive && u.team !== unit.team).map((u) => ({ ...u, radius: UNITS[u.cardId].radius })),
                ...this.towers.filter((t) => t.alive && t.team !== unit.team).map((t) => ({ ...t, radius: 18 }))
            ].filter((e) => Math.abs(e.y - unit.y) < data.range + 85 && Math.abs(e.x - unit.x) < 70);

            if (!enemies.length) return null;
            let options = enemies;
            if (data.towerFocus) {
                const towers = enemies.filter((e) => e.kind);
                if (towers.length) options = towers;
            }
            return options.reduce((best, e) => {
                const db = Math.abs(best.y - unit.y) + Math.abs(best.x - unit.x) * 0.25;
                const de = Math.abs(e.y - unit.y) + Math.abs(e.x - unit.x) * 0.25;
                return de < db ? e : best;
            });
        }

        performAttack(unit, data, target) {
            if (data.projectileSpeed > 0) {
                this.projectiles.push({
                    id: `unit-${Math.random().toString(36).slice(2, 8)}`,
                    team: unit.team,
                    x: unit.x,
                    y: unit.y,
                    speed: data.projectileSpeed,
                    damage: data.damage,
                    splash: data.splash,
                    healPower: data.healPower,
                    targetId: target.id,
                    color: data.color,
                    alive: true
                });
                return;
            }

            if (data.healPower > 0) {
                this.heal(target, data.healPower);
                return;
            }

            if (data.splash > 0) {
                for (const enemy of this.getEnemies(unit.team)) {
                    if (enemy.alive && distance(enemy.x, enemy.y, target.x, target.y) <= data.splash) this.damage(enemy, data.damage);
                }
            } else {
                this.damage(target, data.damage);
            }
        }

        getEnemies(team) {
            return [
                ...this.units.filter((u) => u.alive && u.team !== team),
                ...this.towers.filter((t) => t.alive && t.team !== team)
            ];
        }

        updateProjectiles(dt) {
            for (const p of this.projectiles) {
                if (!p.alive) continue;
                const target = this.findActor(p.targetId);
                if (!target || !target.alive) {
                    p.alive = false;
                    continue;
                }
                const dx = target.x - p.x;
                const dy = target.y - p.y;
                const d = Math.hypot(dx, dy);
                if (d <= p.speed * dt + 5) {
                    if (p.healPower > 0) {
                        this.heal(target, p.healPower);
                    } else if (p.splash > 0) {
                        for (const enemy of this.getEnemies(p.team)) {
                            if (enemy.alive && distance(enemy.x, enemy.y, target.x, target.y) <= p.splash) this.damage(enemy, p.damage);
                        }
                    } else {
                        this.damage(target, p.damage);
                    }
                    p.alive = false;
                } else {
                    p.x += (dx / d) * p.speed * dt;
                    p.y += (dy / d) * p.speed * dt;
                }
            }
        }

        findActor(id) {
            return this.units.find((u) => u.id === id && u.alive) || this.towers.find((t) => t.id === id && t.alive) || null;
        }

        damage(actor, amount) {
            actor.hp -= amount;
            if (actor.hp <= 0) {
                actor.hp = 0;
                actor.alive = false;
            }
        }

        heal(actor, amount) {
            actor.hp = Math.min(actor.maxHp, actor.hp + amount);
        }

        cleanup() {
            this.units = this.units.filter((u) => u.alive && u.y >= -40 && u.y <= CANVAS_HEIGHT + 40);
            this.projectiles = this.projectiles.filter((p) => p.alive);

            for (const tower of this.towers) {
                if (tower.alive || tower.counted) continue;
                if (tower.kind === 'princess') {
                    if (tower.team === TEAM_PLAYER) this.botCrown += 1;
                    else this.playerCrown += 1;
                }
                tower.counted = true;
            }
        }

        evaluateGameOver() {
            const playerKing = this.towers.find((t) => t.team === TEAM_PLAYER && t.kind === 'king');
            const botKing = this.towers.find((t) => t.team === TEAM_BOT && t.kind === 'king');

            if (!playerKing?.alive) {
                this.gameOver = true;
                this.winner = TEAM_BOT;
                this.statusMessage = 'Defeat — your King Tower was destroyed.';
                return;
            }
            if (!botKing?.alive) {
                this.gameOver = true;
                this.winner = TEAM_PLAYER;
                this.statusMessage = 'Victory — enemy King Tower destroyed!';
                return;
            }
            if (this.timeLeft > 0) return;

            this.gameOver = true;
            if (this.playerCrown > this.botCrown) {
                this.winner = TEAM_PLAYER;
                this.statusMessage = 'Victory on crowns!';
            } else if (this.botCrown > this.playerCrown) {
                this.winner = TEAM_BOT;
                this.statusMessage = 'Defeat on crowns.';
            } else if (playerKing.hp > botKing.hp) {
                this.winner = TEAM_PLAYER;
                this.statusMessage = 'Victory on tiebreaker king HP!';
            } else if (botKing.hp > playerKing.hp) {
                this.winner = TEAM_BOT;
                this.statusMessage = 'Defeat on tiebreaker king HP.';
            } else {
                this.winner = 'draw';
                this.statusMessage = 'Draw — dead even.';
            }
        }

        draw() {
            const ctx = this.ctx;
            if (!ctx) return;
            const p = this.currentLevel().palette;
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            sky.addColorStop(0, p.sky);
            sky.addColorStop(1, '#f8fcff');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = p.fieldA;
            ctx.fillRect(18, 22, CANVAS_WIDTH - 36, CANVAS_HEIGHT - 44);
            ctx.fillStyle = p.fieldB;
            ctx.fillRect(18, 22, CANVAS_WIDTH - 36, (CANVAS_HEIGHT - 44) / 2);

            this.drawArenaOrnaments(ctx, p);
            this.drawDeploymentHint(ctx);
            this.drawTowers(ctx);
            this.drawUnits(ctx);
            this.drawProjectiles(ctx);
            this.drawTopOverlay(ctx);
            if (this.gameOver) this.drawEndOverlay(ctx);
        }

        drawArenaOrnaments(ctx, p) {
            ctx.fillStyle = p.river;
            ctx.fillRect(18, BRIDGE_Y - 34, CANVAS_WIDTH - 36, 68);
            ctx.fillStyle = p.bridge;
            for (const x of LANES_X) ctx.fillRect(x - 28, BRIDGE_Y - 42, 56, 84);

            ctx.strokeStyle = p.lane;
            ctx.lineWidth = 2;
            for (const x of LANES_X) {
                ctx.beginPath();
                ctx.moveTo(x, 34);
                ctx.lineTo(x, CANVAS_HEIGHT - 34);
                ctx.stroke();
            }

            // arena frame + soft decorations
            ctx.strokeStyle = 'rgba(34,54,93,0.22)';
            ctx.lineWidth = 3;
            ctx.strokeRect(18, 22, CANVAS_WIDTH - 36, CANVAS_HEIGHT - 44);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(54, 62, 24, 0, Math.PI * 2);
            ctx.arc(CANVAS_WIDTH - 54, 62, 24, 0, Math.PI * 2);
            ctx.fill();
        }

        drawDeploymentHint(ctx) {
            if (this.gameOver) return;
            ctx.fillStyle = 'rgba(80, 105, 170, 0.14)';
            ctx.fillRect(18, BRIDGE_Y + 34, CANVAS_WIDTH - 36, CANVAS_HEIGHT - BRIDGE_Y - 56);
            ctx.fillStyle = 'rgba(28,46,84,0.75)';
            ctx.font = '12px Inter, Arial, sans-serif';
            ctx.fillText('Tap in this zone to deploy selected troop', 96, BRIDGE_Y + 54);
        }

        drawTowers(ctx) {
            for (const tower of this.towers) {
                if (!tower.alive) continue;
                const isPlayer = tower.team === TEAM_PLAYER;
                const body = isPlayer ? '#4c76d5' : '#e05c67';
                const roof = isPlayer ? '#6f95f0' : '#f7848e';

                ctx.fillStyle = body;
                ctx.beginPath();
                ctx.roundRect(tower.x - tower.width / 2, tower.y - tower.height / 2, tower.width, tower.height, 9);
                ctx.fill();
                ctx.fillStyle = roof;
                ctx.fillRect(tower.x - tower.width / 2 + 5, tower.y - tower.height / 2 - 10, tower.width - 10, 14);

                this.drawHealthBar(ctx, tower.x - 24, tower.y - tower.height / 2 - 18, 48, 6, tower.hp, tower.maxHp);
                this.drawText(ctx, tower.kind === 'king' ? 'K' : 'P', tower.x, tower.y + 4, '#fff', 13, true);
            }
        }

        drawUnits(ctx) {
            for (const unit of this.units) {
                if (!unit.alive) continue;
                const data = UNITS[unit.cardId];
                ctx.fillStyle = data.color;
                ctx.beginPath();
                ctx.arc(unit.x, unit.y, data.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = unit.team === TEAM_PLAYER ? '#e9efff' : '#ffe6ea';
                ctx.beginPath();
                ctx.arc(unit.x, unit.y, Math.max(3, data.radius * 0.34), 0, Math.PI * 2);
                ctx.fill();
                this.drawHealthBar(ctx, unit.x - 16, unit.y - data.radius - 12, 32, 5, unit.hp, unit.maxHp);
            }
        }

        drawProjectiles(ctx) {
            for (const p of this.projectiles) {
                if (!p.alive) continue;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        drawTopOverlay(ctx) {
            const playerKing = this.towers.find((t) => t.team === TEAM_PLAYER && t.kind === 'king');
            const botKing = this.towers.find((t) => t.team === TEAM_BOT && t.kind === 'king');
            if (!playerKing || !botKing) return;

            ctx.fillStyle = 'rgba(16, 28, 42, 0.56)';
            ctx.fillRect(20, 8, CANVAS_WIDTH - 40, 22);
            this.drawText(ctx, `Bot King HP ${Math.ceil(botKing.hp)}`, 80, 23, '#dfeeff', 12);
            this.drawText(ctx, `Your King HP ${Math.ceil(playerKing.hp)}`, CANVAS_WIDTH - 122, 23, '#dfeeff', 12);
            this.drawText(ctx, `Selected: ${UNITS[this.selectedCard].name}`, CANVAS_WIDTH / 2, 23, '#fff', 12, true);
        }

        drawEndOverlay(ctx) {
            ctx.fillStyle = 'rgba(7, 16, 26, 0.65)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const title = this.winner === TEAM_PLAYER ? 'Victory!' : this.winner === TEAM_BOT ? 'Defeat' : 'Draw';
            this.drawText(ctx, title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30, '#fff', 44, true);
            this.drawText(ctx, `Final crowns: ${this.playerCrown} : ${this.botCrown}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10, '#f4f8ff', 18, true);
            this.drawText(ctx, 'Tap Restart or Next Arena below', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 38, '#d2e0f5', 14, true);
        }

        drawHealthBar(ctx, x, y, width, height, hp, maxHp) {
            const ratio = clamp(hp / maxHp, 0, 1);
            ctx.fillStyle = 'rgba(13, 23, 35, 0.8)';
            ctx.fillRect(x, y, width, height);
            ctx.fillStyle = '#48cf92';
            ctx.fillRect(x, y, width * ratio, height);
        }

        drawText(ctx, text, x, y, color = '#fff', size = 14, centered = false) {
            ctx.fillStyle = color;
            ctx.font = `${size}px Inter, Arial, sans-serif`;
            if (!centered) {
                ctx.fillText(text, x, y);
                return;
            }
            const m = ctx.measureText(text);
            ctx.fillText(text, x - m.width / 2, y);
        }

        syncHud(force = false) {
            const version = [Math.round(this.timeLeft * 10), Math.round(this.playerElixir * 10), Math.round(this.botElixir * 10), this.playerCrown, this.botCrown, this.statusMessage].join('|');
            if (!force && version === this.stateVersion) return;
            this.stateVersion = version;

            const timer = document.getElementById('clash-timer');
            const score = document.getElementById('clash-score');
            const pElixir = document.getElementById('clash-player-elixir');
            const bElixir = document.getElementById('clash-bot-elixir');
            const status = document.getElementById('clash-status');
            const substatus = document.getElementById('clash-substatus');
            const message = document.getElementById('clash-message');

            const mins = Math.floor(this.timeLeft / 60);
            const secs = Math.floor(this.timeLeft % 60);
            if (timer) timer.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
            if (score) score.textContent = `👑 ${this.playerCrown} : ${this.botCrown} 👑`;
            if (pElixir) pElixir.textContent = `Elixir ${this.playerElixir.toFixed(1)}`;
            if (bElixir) bElixir.textContent = `Elixir ${this.botElixir.toFixed(1)}`;
            if (status) status.textContent = `Arena ${this.levelIndex + 1} · ${this.currentLevel().name}`;
            if (substatus) substatus.textContent = this.gameOver ? this.statusMessage : 'Tap a troop card, then tap any spot below the river.';
            if (message) message.textContent = this.statusMessage;
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
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function bindControls() {
        document.querySelectorAll('[data-clash-card]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!game) return;
                game.selectedCard = button.dataset.clashCard;
                setActiveCard(game.selectedCard);
                game.statusMessage = `${UNITS[game.selectedCard].name} selected. Tap your side to deploy.`;
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

        const restartBtn = document.getElementById('clash-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (!game) return;
                game.resetMatch();
                game.start();
            });
        }

        const nextBtn = document.getElementById('clash-next-level');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (!game) return;
                game.levelIndex = (game.levelIndex + 1) % LEVELS.length;
                game.resetMatch();
                game.start();
            });
        }
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
