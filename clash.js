// Vertical Clash-style browser arena with live bot-vs-player combat.

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
        knight: {
            id: 'knight',
            name: 'Knight',
            cost: 3,
            hp: 420,
            speed: 74,
            damage: 54,
            cooldown: 0.84,
            range: 18,
            radius: 12,
            color: '#4d7bde',
            projectileSpeed: 0,
            splash: 0,
            towerFocus: false,
            healPower: 0
        },
        archer: {
            id: 'archer',
            name: 'Archer',
            cost: 3,
            hp: 230,
            speed: 66,
            damage: 34,
            cooldown: 0.95,
            range: 150,
            radius: 11,
            color: '#44ba84',
            projectileSpeed: 290,
            splash: 0,
            towerFocus: false,
            healPower: 0
        },
        giant: {
            id: 'giant',
            name: 'Giant',
            cost: 5,
            hp: 960,
            speed: 52,
            damage: 88,
            cooldown: 1.15,
            range: 20,
            radius: 17,
            color: '#e09a4f',
            projectileSpeed: 0,
            splash: 0,
            towerFocus: true,
            healPower: 0
        },
        wizard: {
            id: 'wizard',
            name: 'Wizard',
            cost: 4,
            hp: 320,
            speed: 63,
            damage: 43,
            cooldown: 1,
            range: 132,
            radius: 12,
            color: '#9d6bf8',
            projectileSpeed: 255,
            splash: 48,
            towerFocus: false,
            healPower: 0
        },
        bomber: {
            id: 'bomber',
            name: 'Bomber',
            cost: 3,
            hp: 250,
            speed: 60,
            damage: 58,
            cooldown: 1.2,
            range: 118,
            radius: 11,
            color: '#ff7584',
            projectileSpeed: 240,
            splash: 64,
            towerFocus: false,
            healPower: 0
        },
        healer: {
            id: 'healer',
            name: 'Healer',
            cost: 4,
            hp: 280,
            speed: 70,
            damage: 0,
            cooldown: 0.9,
            range: 110,
            radius: 11,
            color: '#e4c15d',
            projectileSpeed: 220,
            splash: 0,
            towerFocus: false,
            healPower: 52
        }
    };

    const TOWER_TEMPLATE = {
        princess: { hp: 1800, damage: 52, range: 210, cooldown: 0.88, projectileSpeed: 330, width: 38, height: 40 },
        king: { hp: 3000, damage: 90, range: 235, cooldown: 0.9, projectileSpeed: 350, width: 44, height: 46 }
    };

    const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    class EntityStore {
        constructor() {
            this.units = [];
            this.towers = [];
            this.projectiles = [];
        }

        clear() {
            this.units.length = 0;
            this.towers.length = 0;
            this.projectiles.length = 0;
        }
    }

    class ClashBrowserGame {
        constructor() {
            this.canvas = document.getElementById('clash-canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
            this.entities = new EntityStore();
            this.levelIndex = 0;
            this.selectedCard = 'knight';
            this.selectedLane = 1;
            this.running = false;
            this.paused = false;
            this.lastTs = 0;
            this.stateVersion = 0;
            this.resetMatch(true);
        }

        currentLevel() {
            return LEVELS[this.levelIndex];
        }

        resetMatch(resetLevel = false) {
            if (resetLevel) this.levelIndex = clamp(this.levelIndex, 0, LEVELS.length - 1);
            this.entities.clear();
            const level = this.currentLevel();

            this.playerElixir = 5;
            this.botElixir = 5;
            this.maxElixir = 10;
            this.timeLeft = level.duration;
            this.playerCrown = 0;
            this.botCrown = 0;
            this.paused = false;
            this.gameOver = false;
            this.winner = null;
            this.statusMessage = 'Deploy troops and overwhelm bot defenses.';
            this.botSpawnTimer = 1 + Math.random() * 1.1;
            this.botBurstCooldown = 0;
            this.logs = [];

            this.spawnTowers();
            this.syncHud(true);
        }

        spawnTowers() {
            const addTower = (team, kind, x, y, laneIndex = 1) => {
                const base = TOWER_TEMPLATE[kind];
                this.entities.towers.push({
                    id: `${team}-${kind}-${Math.random().toString(36).slice(2, 8)}`,
                    kind,
                    team,
                    laneIndex,
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

            // Bot top
            addTower(TEAM_BOT, 'princess', LANES_X[0], 92, 0);
            addTower(TEAM_BOT, 'princess', LANES_X[2], 92, 2);
            addTower(TEAM_BOT, 'king', LANES_X[1], 52, 1);

            // Player bottom
            addTower(TEAM_PLAYER, 'princess', LANES_X[0], CANVAS_HEIGHT - 92, 0);
            addTower(TEAM_PLAYER, 'princess', LANES_X[2], CANVAS_HEIGHT - 92, 2);
            addTower(TEAM_PLAYER, 'king', LANES_X[1], CANVAS_HEIGHT - 52, 1);
        }

        start() {
            if (!this.canvas || !this.ctx) return;
            if (this.running) return;
            this.running = true;
            this.lastTs = performance.now();
            requestAnimationFrame((ts) => this.loop(ts));
        }

        stop() {
            this.running = false;
        }

        loop(ts) {
            if (!this.running) return;
            const dt = Math.min(FPS_DT_CAP, (ts - this.lastTs) / 1000);
            this.lastTs = ts;

            if (!this.paused) this.update(dt);
            this.draw();
            requestAnimationFrame((nextTs) => this.loop(nextTs));
        }

        deploy(cardId, team, laneIndex, override = false) {
            const unitData = UNITS[cardId];
            if (!unitData) return false;

            if (!override) {
                if (team === TEAM_PLAYER) {
                    if (this.playerElixir < unitData.cost) return false;
                    this.playerElixir -= unitData.cost;
                } else {
                    if (this.botElixir < unitData.cost) return false;
                    this.botElixir -= unitData.cost;
                }
            }

            const laneX = LANES_X[laneIndex];
            const isPlayer = team === TEAM_PLAYER;
            const spawnY = isPlayer ? CANVAS_HEIGHT - 145 + (Math.random() * 16 - 8) : 145 + (Math.random() * 16 - 8);

            this.entities.units.push({
                id: `${team}-${cardId}-${Math.random().toString(36).slice(2, 9)}`,
                team,
                cardId,
                laneIndex,
                x: laneX + (Math.random() * 8 - 4),
                y: spawnY,
                hp: unitData.hp,
                maxHp: unitData.hp,
                attackTimer: Math.random() * unitData.cooldown,
                retargetTimer: 0,
                alive: true
            });
            return true;
        }

        update(dt) {
            if (this.gameOver) return;

            const level = this.currentLevel();
            this.timeLeft = Math.max(0, this.timeLeft - dt);

            const suddenDeath = this.timeLeft <= 60 ? 1.38 : 1;
            this.playerElixir = clamp(this.playerElixir + level.elixirRegen * suddenDeath * dt, 0, this.maxElixir);
            this.botElixir = clamp(this.botElixir + (level.elixirRegen + level.botBonus) * suddenDeath * dt, 0, this.maxElixir);

            this.updateBot(dt, level);
            this.updateTowers(dt);
            this.updateUnits(dt);
            this.updateProjectiles(dt);
            this.cleanupEntities();
            this.evaluateGameOver();

            this.syncHud();
        }

        updateBot(dt, level) {
            this.botSpawnTimer -= dt;
            this.botBurstCooldown = Math.max(0, this.botBurstCooldown - dt);
            if (this.botSpawnTimer > 0) return;

            const lanePressure = [0, 1, 2].map((lane) => {
                const playerForce = this.entities.units
                    .filter((u) => u.team === TEAM_PLAYER && u.laneIndex === lane)
                    .reduce((sum, u) => sum + u.hp, 0);
                const botForce = this.entities.units
                    .filter((u) => u.team === TEAM_BOT && u.laneIndex === lane)
                    .reduce((sum, u) => sum + u.hp, 0);
                return { lane, pressure: playerForce - botForce + (Math.random() * 180 - 90) };
            });

            lanePressure.sort((a, b) => b.pressure - a.pressure);
            const lane = lanePressure[0].lane;

            const pool = ['knight', 'archer', 'bomber'];
            if (Math.random() < 0.42 * level.botSkill) pool.push('wizard');
            if (Math.random() < 0.35 * level.botSkill) pool.push('giant');
            if (Math.random() < 0.28 * level.botSkill) pool.push('healer');

            const choice = pool[Math.floor(Math.random() * pool.length)];
            const chosenCost = UNITS[choice].cost;

            if (this.botElixir >= chosenCost) {
                this.botElixir -= chosenCost;
                this.deploy(choice, TEAM_BOT, lane, true);

                if (this.botBurstCooldown <= 0 && this.botElixir >= 3 && Math.random() < 0.42 * level.botSkill) {
                    const secondLane = Math.random() < 0.72 ? lane : Math.floor(Math.random() * 3);
                    const support = Math.random() < 0.5 ? 'knight' : 'archer';
                    if (this.botElixir >= UNITS[support].cost) {
                        this.botElixir -= UNITS[support].cost;
                        this.deploy(support, TEAM_BOT, secondLane, true);
                        this.botBurstCooldown = 2.1;
                    }
                }
            }

            this.botSpawnTimer = 0.88 + Math.random() * (1.1 / level.botSkill);
        }

        updateTowers(dt) {
            for (const tower of this.entities.towers) {
                if (!tower.alive) continue;
                tower.attackTimer -= dt;
                if (tower.attackTimer > 0) continue;

                const target = this.pickTargetForTower(tower);
                if (!target) continue;

                this.entities.projectiles.push({
                    id: `tower-shot-${Math.random().toString(36).slice(2, 8)}`,
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

        pickTargetForTower(tower) {
            let best = null;
            let bestDist = Infinity;
            for (const unit of this.entities.units) {
                if (!unit.alive || unit.team === tower.team) continue;
                const d = distance(tower.x, tower.y, unit.x, unit.y);
                if (d <= tower.range && d < bestDist) {
                    best = unit;
                    bestDist = d;
                }
            }
            return best;
        }

        updateUnits(dt) {
            for (const unit of this.entities.units) {
                if (!unit.alive) continue;
                const data = UNITS[unit.cardId];
                unit.attackTimer -= dt;
                unit.retargetTimer -= dt;

                const target = this.pickTargetForUnit(unit, data);
                if (target) {
                    const d = distance(unit.x, unit.y, target.x, target.y);
                    if (d <= data.range + (target.radius || target.width || 16) * 0.52) {
                        if (unit.attackTimer <= 0) {
                            this.fireUnitAttack(unit, data, target);
                            unit.attackTimer = data.cooldown;
                        }
                        continue;
                    }
                }

                const direction = unit.team === TEAM_PLAYER ? -1 : 1;
                const speed = data.speed * (Math.abs(unit.y - BRIDGE_Y) < 52 ? 0.86 : 1);
                unit.y += direction * speed * dt;
                const laneX = LANES_X[unit.laneIndex];
                unit.x += (laneX - unit.x) * dt * 4.2;
            }
        }

        pickTargetForUnit(unit, data) {
            const enemies = this.getEnemyActors(unit.team)
                .filter((actor) => Math.abs(actor.x - unit.x) < 70 && Math.abs(actor.y - unit.y) < data.range + 70);
            if (!enemies.length) return null;

            let candidates = enemies;
            if (data.healPower > 0) {
                const allies = this.getAllyActors(unit.team)
                    .filter((a) => a.id !== unit.id && a.hp < a.maxHp * 0.95 && Math.abs(a.x - unit.x) < data.range + 30 && Math.abs(a.y - unit.y) < data.range + 30);
                if (!allies.length) return null;
                return allies.reduce((best, a) => (a.hp / a.maxHp < best.hp / best.maxHp ? a : best));
            }
            if (data.towerFocus) {
                const towerCandidates = enemies.filter((e) => e.kind === 'princess' || e.kind === 'king');
                if (towerCandidates.length) candidates = towerCandidates;
            }

            return candidates.reduce((best, e) => {
                const db = Math.abs(best.y - unit.y) + Math.abs(best.x - unit.x) * 0.35;
                const de = Math.abs(e.y - unit.y) + Math.abs(e.x - unit.x) * 0.35;
                return de < db ? e : best;
            });
        }

        fireUnitAttack(unit, data, target) {
            if (data.projectileSpeed > 0) {
                this.entities.projectiles.push({
                    id: `unit-shot-${Math.random().toString(36).slice(2, 8)}`,
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
                this.applyHeal(target, data.healPower);
                return;
            }

            if (data.splash > 0) {
                for (const enemy of this.getEnemyActors(unit.team)) {
                    if (!enemy.alive) continue;
                    if (distance(enemy.x, enemy.y, target.x, target.y) <= data.splash) {
                        this.applyDamage(enemy, data.damage);
                    }
                }
            } else {
                this.applyDamage(target, data.damage);
            }
        }

        updateProjectiles(dt) {
            for (const projectile of this.entities.projectiles) {
                if (!projectile.alive) continue;
                const target = this.findActorById(projectile.targetId);
                if (!target || !target.alive) {
                    projectile.alive = false;
                    continue;
                }

                const dx = target.x - projectile.x;
                const dy = target.y - projectile.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= projectile.speed * dt + 5) {
                    if (projectile.healPower > 0) {
                        this.applyHeal(target, projectile.healPower);
                    } else if (projectile.splash > 0) {
                        for (const enemy of this.getEnemyActors(projectile.team)) {
                            if (!enemy.alive) continue;
                            if (distance(enemy.x, enemy.y, target.x, target.y) <= projectile.splash) {
                                this.applyDamage(enemy, projectile.damage);
                            }
                        }
                    } else {
                        this.applyDamage(target, projectile.damage);
                    }
                    projectile.alive = false;
                } else {
                    projectile.x += (dx / dist) * projectile.speed * dt;
                    projectile.y += (dy / dist) * projectile.speed * dt;
                }
            }
        }

        applyDamage(actor, amount) {
            actor.hp -= amount;
            if (actor.hp <= 0) {
                actor.hp = 0;
                actor.alive = false;
            }
            if (actor.kind) {
                const real = this.entities.towers.find((tower) => tower.id === actor.id);
                if (real) {
                    real.hp = actor.hp;
                    real.alive = actor.alive;
                }
            }
        }

        applyHeal(actor, amount) {
            actor.hp = Math.min(actor.maxHp, actor.hp + amount);
            if (actor.kind) {
                const real = this.entities.towers.find((tower) => tower.id === actor.id);
                if (real) real.hp = actor.hp;
            }
        }

        getEnemyActors(team) {
            return [
                ...this.entities.units.filter((u) => u.alive && u.team !== team).map((u) => ({ ...u, radius: UNITS[u.cardId].radius })),
                ...this.entities.towers.filter((t) => t.alive && t.team !== team).map((t) => ({ ...t, radius: 18 }))
            ];
        }

        getAllyActors(team) {
            return [
                ...this.entities.units.filter((u) => u.alive && u.team === team).map((u) => ({ ...u, radius: UNITS[u.cardId].radius })),
                ...this.entities.towers.filter((t) => t.alive && t.team === team).map((t) => ({ ...t, radius: 18 }))
            ];
        }

        findActorById(id) {
            const unit = this.entities.units.find((u) => u.id === id && u.alive);
            if (unit) return unit;
            const tower = this.entities.towers.find((t) => t.id === id && t.alive);
            return tower || null;
        }

        cleanupEntities() {
            this.entities.units = this.entities.units.filter((u) => u.alive && u.y >= -40 && u.y <= CANVAS_HEIGHT + 40);
            this.entities.projectiles = this.entities.projectiles.filter((p) => p.alive);

            for (const tower of this.entities.towers) {
                if (tower.alive || tower.counted) continue;
                if (tower.kind === 'princess') {
                    if (tower.team === TEAM_PLAYER) this.botCrown += 1;
                    else this.playerCrown += 1;
                }
                tower.counted = true;
            }
        }

        evaluateGameOver() {
            const playerKing = this.entities.towers.find((t) => t.team === TEAM_PLAYER && t.kind === 'king');
            const botKing = this.entities.towers.find((t) => t.team === TEAM_BOT && t.kind === 'king');

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
            } else {
                if (playerKing.hp > botKing.hp) {
                    this.winner = TEAM_PLAYER;
                    this.statusMessage = 'Victory on tiebreaker tower HP!';
                } else if (botKing.hp > playerKing.hp) {
                    this.winner = TEAM_BOT;
                    this.statusMessage = 'Defeat on tiebreaker tower HP.';
                } else {
                    this.winner = 'draw';
                    this.statusMessage = 'Draw — dead even.';
                }
            }
        }

        draw() {
            const ctx = this.ctx;
            if (!ctx) return;
            const level = this.currentLevel();
            const p = level.palette;

            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // background
            const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            g.addColorStop(0, p.sky);
            g.addColorStop(1, '#f8fcff');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = p.fieldA;
            ctx.fillRect(18, 22, CANVAS_WIDTH - 36, CANVAS_HEIGHT - 44);
            ctx.fillStyle = p.fieldB;
            ctx.fillRect(18, 22, CANVAS_WIDTH - 36, (CANVAS_HEIGHT - 44) / 2);

            // river + bridge
            ctx.fillStyle = p.river;
            ctx.fillRect(18, BRIDGE_Y - 34, CANVAS_WIDTH - 36, 68);

            ctx.fillStyle = p.bridge;
            for (const laneX of LANES_X) {
                ctx.fillRect(laneX - 28, BRIDGE_Y - 42, 56, 84);
            }

            // lane markers
            ctx.strokeStyle = p.lane;
            ctx.lineWidth = 2;
            for (const x of LANES_X) {
                ctx.beginPath();
                ctx.moveTo(x, 34);
                ctx.lineTo(x, CANVAS_HEIGHT - 34);
                ctx.stroke();
            }

            this.drawTowers(ctx);
            this.drawUnits(ctx);
            this.drawProjectiles(ctx);
            this.drawArenaOverlay(ctx);

            if (this.gameOver) this.drawEndOverlay(ctx);
        }

        drawTowers(ctx) {
            for (const tower of this.entities.towers) {
                if (!tower.alive) continue;
                const isPlayer = tower.team === TEAM_PLAYER;
                const bodyColor = isPlayer ? '#4c76d5' : '#e05c67';
                const roofColor = isPlayer ? '#6f95f0' : '#f7848e';

                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                ctx.roundRect(tower.x - tower.width / 2, tower.y - tower.height / 2, tower.width, tower.height, 9);
                ctx.fill();
                ctx.fillStyle = roofColor;
                ctx.fillRect(tower.x - (tower.width / 2 - 5), tower.y - tower.height / 2 - 10, tower.width - 10, 14);

                this.drawHealthBar(ctx, tower.x - 24, tower.y - tower.height / 2 - 18, 48, 6, tower.hp, tower.maxHp);
                this.drawText(ctx, tower.kind === 'king' ? 'K' : 'P', tower.x, tower.y + 4, '#ffffff', 13, true);
            }
        }

        drawUnits(ctx) {
            for (const unit of this.entities.units) {
                if (!unit.alive) continue;
                const data = UNITS[unit.cardId];
                const enemyTint = unit.team === TEAM_BOT ? '#ffe6ea' : '#e8eeff';

                ctx.fillStyle = data.color;
                ctx.beginPath();
                ctx.arc(unit.x, unit.y, data.radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = enemyTint;
                ctx.beginPath();
                ctx.arc(unit.x, unit.y, Math.max(3, data.radius * 0.34), 0, Math.PI * 2);
                ctx.fill();

                this.drawHealthBar(ctx, unit.x - 16, unit.y - data.radius - 12, 32, 5, unit.hp, unit.maxHp);
            }
        }

        drawProjectiles(ctx) {
            for (const proj of this.entities.projectiles) {
                if (!proj.alive) continue;
                ctx.fillStyle = proj.color;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, 4.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        drawArenaOverlay(ctx) {
            const playerKing = this.entities.towers.find((t) => t.team === TEAM_PLAYER && t.kind === 'king');
            const botKing = this.entities.towers.find((t) => t.team === TEAM_BOT && t.kind === 'king');
            if (!playerKing || !botKing) return;

            ctx.fillStyle = 'rgba(16, 28, 42, 0.56)';
            ctx.fillRect(20, 8, CANVAS_WIDTH - 40, 22);

            this.drawText(ctx, `Bot King HP ${Math.ceil(botKing.hp)}`, 78, 23, '#dfeeff', 12);
            this.drawText(ctx, `Your King HP ${Math.ceil(playerKing.hp)}`, CANVAS_WIDTH - 86, 23, '#dfeeff', 12);
            this.drawText(ctx, `Lane ${this.selectedLane + 1}`, CANVAS_WIDTH / 2, 23, '#fff', 12, true);
        }

        drawEndOverlay(ctx) {
            ctx.fillStyle = 'rgba(7, 16, 26, 0.65)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = '#fff';

            const title = this.winner === TEAM_PLAYER ? 'Victory!' : this.winner === TEAM_BOT ? 'Defeat' : 'Draw';
            this.drawText(ctx, title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30, '#ffffff', 44, true);
            this.drawText(ctx, `Final crowns: ${this.playerCrown} : ${this.botCrown}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10, '#f4f8ff', 18, true);
            this.drawText(ctx, 'Use Restart or Next Arena below', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 38, '#d2e0f5', 14, true);
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
            if (centered) {
                const m = ctx.measureText(text);
                ctx.fillText(text, x - m.width / 2, y);
            } else {
                ctx.fillText(text, x, y);
            }
        }

        syncHud(force = false) {
            const versionSeed = [
                Math.round(this.timeLeft * 10),
                Math.round(this.playerElixir * 10),
                Math.round(this.botElixir * 10),
                this.playerCrown,
                this.botCrown,
                Number(this.gameOver)
            ].join('|');
            if (!force && versionSeed === this.stateVersion) return;
            this.stateVersion = versionSeed;

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
            if (substatus) substatus.textContent = this.gameOver ? this.statusMessage : 'Tap Deploy to place troops in selected lane.';
            if (message) message.textContent = this.statusMessage;
        }
    }

    let game = null;

    function setActive(selector, key, value) {
        document.querySelectorAll(selector).forEach((el) => {
            el.classList.toggle('active', el.dataset[key] === String(value));
        });
    }

    function bindControls() {
        document.querySelectorAll('[data-clash-card]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!game) return;
                game.selectedCard = button.dataset.clashCard;
                setActive('[data-clash-card]', 'clashCard', game.selectedCard);
                game.syncHud(true);
            });
        });

        document.querySelectorAll('[data-clash-lane]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!game) return;
                game.selectedLane = Number(button.dataset.clashLane);
                setActive('[data-clash-lane]', 'clashLane', game.selectedLane);
                game.syncHud(true);
            });
        });

        const spawnBtn = document.getElementById('clash-spawn');
        if (spawnBtn) {
            spawnBtn.addEventListener('click', () => {
                if (!game || game.gameOver) return;
                const ok = game.deploy(game.selectedCard, TEAM_PLAYER, game.selectedLane);
                if (!ok) {
                    game.statusMessage = `Need ${UNITS[game.selectedCard].cost} elixir for ${UNITS[game.selectedCard].name}.`;
                } else {
                    game.statusMessage = `${UNITS[game.selectedCard].name} deployed in lane ${game.selectedLane + 1}.`;
                }
                game.syncHud(true);
            });
        }

        const restartBtn = document.getElementById('clash-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (!game) return;
                game.resetMatch();
                game.start();
            });
        }

        const nextLevelBtn = document.getElementById('clash-next-level');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', () => {
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
        setActive('[data-clash-card]', 'clashCard', game.selectedCard);
        setActive('[data-clash-lane]', 'clashLane', game.selectedLane);
    }

    window.initClash = initClash;
})();
