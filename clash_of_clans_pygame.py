#!/usr/bin/env python3
"""Clash-inspired real-time strategy game using Pygame.

Features
- Real-time lane-based combat with bot AI.
- Multiple unit classes (tank, melee, ranged, splash, healer).
- Three themed level layouts and scaling bot strategies.
- Resource economy (elixir), deck-style spawning, towers, projectiles.
- Pause, restart, and level selection.

Run:
    python3 clash_of_clans_pygame.py
"""
from __future__ import annotations

import math
import random
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import pygame


# --------------------------------------------------------------------------------------
# Global constants and palettes
# --------------------------------------------------------------------------------------
WIDTH, HEIGHT = 1280, 720
FPS = 60
LANES = [220, 360, 500]
RIVER_X = WIDTH // 2
GROUND_TOP = 130
GROUND_BOTTOM = HEIGHT - 60

TEAM_PLAYER = "player"
TEAM_BOT = "bot"

WHITE = (245, 247, 255)
BLACK = (22, 24, 31)
BLUE = (86, 132, 255)
RED = (237, 91, 108)
GREEN = (70, 193, 140)
YELLOW = (254, 206, 81)
ORANGE = (242, 149, 76)
PURPLE = (181, 122, 255)
GRAY = (126, 140, 163)


LEVELS = {
    1: {
        "name": "Emerald Plains",
        "theme": {
            "bg": (210, 243, 215),
            "river": (126, 193, 255),
            "platform": (189, 232, 184),
            "bridge": (163, 122, 89),
        },
        "bot_skill": 0.8,
        "bot_elixir_bonus": 0.2,
        "duration": 180,
    },
    2: {
        "name": "Sunset Canyon",
        "theme": {
            "bg": (252, 223, 196),
            "river": (154, 206, 255),
            "platform": (232, 187, 145),
            "bridge": (145, 98, 68),
        },
        "bot_skill": 1.0,
        "bot_elixir_bonus": 0.38,
        "duration": 200,
    },
    3: {
        "name": "Frostforge",
        "theme": {
            "bg": (208, 228, 250),
            "river": (143, 192, 237),
            "platform": (186, 210, 234),
            "bridge": (104, 128, 146),
        },
        "bot_skill": 1.24,
        "bot_elixir_bonus": 0.56,
        "duration": 220,
    },
}


@dataclass
class UnitStats:
    name: str
    cost: int
    health: float
    speed: float
    damage: float
    cooldown: float
    range: float
    radius: int
    color: Tuple[int, int, int]
    target_mode: str = "ground"
    splash: float = 0
    projectile_speed: float = 0
    heal: float = 0


UNIT_TYPES: Dict[str, UnitStats] = {
    "knight": UnitStats("Knight", 3, 420, 78, 62, 0.92, 28, 14, BLUE),
    "archer": UnitStats("Archer", 3, 215, 72, 46, 1.0, 190, 12, GREEN, projectile_speed=360),
    "giant": UnitStats("Giant", 5, 980, 52, 86, 1.18, 30, 20, ORANGE),
    "wizard": UnitStats("Wizard", 4, 310, 70, 58, 1.1, 165, 13, PURPLE, splash=48, projectile_speed=290),
    "healer": UnitStats("Healer", 4, 280, 74, 0, 0.85, 120, 12, YELLOW, heal=48),
    "bomber": UnitStats("Bomber", 3, 220, 68, 72, 1.2, 145, 12, RED, splash=64, projectile_speed=250),
}


@dataclass
class TowerStats:
    name: str
    health: float
    damage: float
    cooldown: float
    range: float
    projectile_speed: float
    color: Tuple[int, int, int]


TOWER_PRINCESS = TowerStats("Princess", 1800, 53, 0.84, 255, 400, (56, 74, 112))
TOWER_KING = TowerStats("King", 3000, 95, 0.92, 280, 420, (44, 58, 96))


class Projectile:
    __slots__ = (
        "x",
        "y",
        "target",
        "speed",
        "damage",
        "splash",
        "team",
        "color",
        "radius",
        "alive",
        "heal",
    )

    def __init__(
        self,
        x: float,
        y: float,
        target: "Actor",
        speed: float,
        damage: float,
        splash: float,
        team: str,
        color: Tuple[int, int, int],
        radius: int = 5,
        heal: float = 0,
    ):
        self.x = x
        self.y = y
        self.target = target
        self.speed = speed
        self.damage = damage
        self.splash = splash
        self.team = team
        self.color = color
        self.radius = radius
        self.alive = True
        self.heal = heal

    def update(self, dt: float, world: "GameWorld") -> None:
        if not self.alive:
            return
        if not self.target.alive:
            self.alive = False
            return
        dx = self.target.x - self.x
        dy = self.target.y - self.y
        dist = math.hypot(dx, dy)
        if dist < self.speed * dt + max(4, self.target.radius * 0.45):
            self.apply_hit(world)
            self.alive = False
            return
        if dist > 0:
            self.x += (dx / dist) * self.speed * dt
            self.y += (dy / dist) * self.speed * dt

    def apply_hit(self, world: "GameWorld") -> None:
        if self.heal > 0:
            self.target.health = min(self.target.max_health, self.target.health + self.heal)
            return
        if self.splash > 0:
            for actor in world.enemy_actors(self.team):
                if not actor.alive:
                    continue
                if math.hypot(actor.x - self.target.x, actor.y - self.target.y) <= self.splash:
                    actor.take_damage(self.damage)
        else:
            self.target.take_damage(self.damage)

    def draw(self, screen: pygame.Surface) -> None:
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)


class Actor:
    def __init__(self, team: str, x: float, y: float, health: float, radius: int):
        self.team = team
        self.x = x
        self.y = y
        self.health = health
        self.max_health = health
        self.radius = radius
        self.alive = True

    def take_damage(self, amount: float) -> None:
        self.health -= amount
        if self.health <= 0:
            self.alive = False


class Unit(Actor):
    __slots__ = (
        "kind",
        "lane",
        "speed",
        "damage",
        "cooldown",
        "range",
        "attack_timer",
        "color",
        "splash",
        "projectile_speed",
        "heal",
        "retarget_timer",
        "target",
        "target_priority_towers",
    )

    def __init__(self, kind: str, team: str, x: float, y: float, lane: int):
        stats = UNIT_TYPES[kind]
        super().__init__(team, x, y, stats.health, stats.radius)
        self.kind = kind
        self.lane = lane
        self.speed = stats.speed
        self.damage = stats.damage
        self.cooldown = stats.cooldown
        self.range = stats.range
        self.attack_timer = random.uniform(0.08, 0.32)
        self.color = stats.color
        self.splash = stats.splash
        self.projectile_speed = stats.projectile_speed
        self.heal = stats.heal
        self.retarget_timer = 0
        self.target: Optional[Actor] = None
        self.target_priority_towers = kind == "giant"

    def find_target(self, world: "GameWorld") -> Optional[Actor]:
        candidates: List[Actor] = []
        if self.heal > 0:
            allies = world.allied_actors(self.team)
            for ally in allies:
                if ally is self or not ally.alive:
                    continue
                if ally.health >= ally.max_health * 0.98:
                    continue
                if abs(ally.y - self.y) < 86 and abs(ally.x - self.x) < self.range + 40:
                    candidates.append(ally)
            if not candidates:
                return None
            return min(candidates, key=lambda a: a.health / max(1, a.max_health))

        enemies = world.enemy_actors(self.team)
        for enemy in enemies:
            if not enemy.alive:
                continue
            if abs(enemy.y - self.y) > 92:
                continue
            candidates.append(enemy)

        if not candidates:
            return None

        if self.target_priority_towers:
            towers = [c for c in candidates if isinstance(c, Tower)]
            if towers:
                return min(towers, key=lambda c: abs(c.x - self.x))
        return min(candidates, key=lambda c: abs(c.x - self.x) + abs(c.y - self.y) * 0.35)

    def step(self, dt: float, world: "GameWorld") -> None:
        if not self.alive:
            return
        self.attack_timer -= dt
        self.retarget_timer -= dt

        if self.target is None or not self.target.alive or self.retarget_timer <= 0:
            self.target = self.find_target(world)
            self.retarget_timer = 0.24

        target = self.target
        if target and target.alive:
            dist = math.hypot(target.x - self.x, target.y - self.y)
            if dist <= self.range + target.radius * 0.5:
                if self.attack_timer <= 0:
                    self.attack(world, target)
                    self.attack_timer = self.cooldown
                return

        direction = 1 if self.team == TEAM_PLAYER else -1
        speed = self.speed

        if (self.team == TEAM_PLAYER and self.x < RIVER_X - 35) or (self.team == TEAM_BOT and self.x > RIVER_X + 35):
            speed *= 0.8

        self.x += direction * speed * dt

        # lane cohesion: drift gently back to lane center
        lane_y = LANES[self.lane]
        offset = lane_y - self.y
        self.y += max(-50 * dt, min(50 * dt, offset * dt * 2.2))

    def attack(self, world: "GameWorld", target: Actor) -> None:
        if self.heal > 0:
            projectile = Projectile(
                self.x,
                self.y,
                target,
                330,
                0,
                0,
                self.team,
                YELLOW,
                radius=4,
                heal=self.heal,
            )
            world.projectiles.append(projectile)
            return
        if self.projectile_speed > 0:
            proj_color = tuple(min(255, c + 20) for c in self.color)
            projectile = Projectile(
                self.x,
                self.y,
                target,
                self.projectile_speed,
                self.damage,
                self.splash,
                self.team,
                proj_color,
                radius=4,
            )
            world.projectiles.append(projectile)
        else:
            if self.splash > 0:
                for actor in world.enemy_actors(self.team):
                    if not actor.alive:
                        continue
                    if math.hypot(actor.x - target.x, actor.y - target.y) <= self.splash:
                        actor.take_damage(self.damage)
            else:
                target.take_damage(self.damage)

    def draw(self, screen: pygame.Surface) -> None:
        if not self.alive:
            return
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)
        inner = (235, 240, 255) if self.team == TEAM_PLAYER else (252, 220, 226)
        pygame.draw.circle(screen, inner, (int(self.x), int(self.y)), max(3, self.radius // 3))

        self.draw_health_bar(screen)

    def draw_health_bar(self, screen: pygame.Surface) -> None:
        width = self.radius * 2 + 4
        x = int(self.x - width // 2)
        y = int(self.y - self.radius - 10)
        ratio = max(0, self.health / self.max_health)
        pygame.draw.rect(screen, (35, 42, 52), (x, y, width, 4), border_radius=2)
        pygame.draw.rect(screen, GREEN, (x, y, int(width * ratio), 4), border_radius=2)


class Tower(Actor):
    __slots__ = (
        "stats",
        "name",
        "attack_timer",
        "color",
        "target",
        "x_base",
        "y_base",
    )

    def __init__(self, team: str, x: float, y: float, stats: TowerStats):
        super().__init__(team, x, y, stats.health, 28)
        self.stats = stats
        self.name = stats.name
        self.attack_timer = random.uniform(0.1, 0.28)
        base_color = stats.color
        if team == TEAM_BOT:
            self.color = (base_color[0] + 45, max(24, base_color[1] - 10), max(24, base_color[2] - 10))
        else:
            self.color = base_color
        self.target: Optional[Actor] = None
        self.x_base = x
        self.y_base = y

    def choose_target(self, world: "GameWorld") -> Optional[Actor]:
        enemies = world.enemy_units(self.team)
        in_range: List[Unit] = []
        for enemy in enemies:
            if not enemy.alive:
                continue
            if math.hypot(enemy.x - self.x, enemy.y - self.y) <= self.stats.range:
                in_range.append(enemy)
        if not in_range:
            return None
        return min(in_range, key=lambda e: (abs(e.x - self.x), e.health))

    def step(self, dt: float, world: "GameWorld") -> None:
        if not self.alive:
            return
        self.attack_timer -= dt
        if self.target is None or not self.target.alive or math.hypot(self.target.x - self.x, self.target.y - self.y) > self.stats.range + 20:
            self.target = self.choose_target(world)
        if self.target and self.attack_timer <= 0:
            projectile = Projectile(
                self.x,
                self.y,
                self.target,
                self.stats.projectile_speed,
                self.stats.damage,
                0,
                self.team,
                self.color,
                radius=5,
            )
            world.projectiles.append(projectile)
            self.attack_timer = self.stats.cooldown

    def draw(self, screen: pygame.Surface) -> None:
        if not self.alive:
            return
        base_rect = pygame.Rect(0, 0, 54, 56)
        base_rect.center = (self.x, self.y)
        pygame.draw.rect(screen, self.color, base_rect, border_radius=9)
        turret_color = tuple(min(255, c + 35) for c in self.color)
        pygame.draw.rect(screen, turret_color, (self.x - 18, self.y - 34, 36, 20), border_radius=7)
        self.draw_health_bar(screen)

    def draw_health_bar(self, screen: pygame.Surface) -> None:
        width = 62
        x = int(self.x - width // 2)
        y = int(self.y - 45)
        ratio = max(0, self.health / self.max_health)
        pygame.draw.rect(screen, (28, 36, 46), (x, y, width, 6), border_radius=3)
        pygame.draw.rect(screen, GREEN, (x, y, int(width * ratio), 6), border_radius=3)


class GameWorld:
    def __init__(self, level_id: int):
        self.level_id = level_id
        self.level = LEVELS[level_id]
        self.units: List[Unit] = []
        self.towers: List[Tower] = []
        self.projectiles: List[Projectile] = []
        self.player_elixir = 5.0
        self.bot_elixir = 5.0
        self.max_elixir = 10
        self.time_left = float(self.level["duration"])
        self.over = False
        self.winner: Optional[str] = None
        self.player_score = 0
        self.bot_score = 0
        self.bot_deck = ["knight", "archer", "giant", "wizard", "healer", "bomber"]
        self.bot_spawn_timer = random.uniform(1.6, 2.8)
        self.log_lines: List[str] = []

        self._spawn_towers()

    def _spawn_towers(self) -> None:
        player_x = 170
        bot_x = WIDTH - 170
        self.towers.extend(
            [
                Tower(TEAM_PLAYER, player_x, LANES[0] - 50, TOWER_PRINCESS),
                Tower(TEAM_PLAYER, player_x, LANES[2] + 50, TOWER_PRINCESS),
                Tower(TEAM_PLAYER, player_x - 40, LANES[1], TOWER_KING),
                Tower(TEAM_BOT, bot_x, LANES[0] - 50, TOWER_PRINCESS),
                Tower(TEAM_BOT, bot_x, LANES[2] + 50, TOWER_PRINCESS),
                Tower(TEAM_BOT, bot_x + 40, LANES[1], TOWER_KING),
            ]
        )

    def allied_actors(self, team: str) -> List[Actor]:
        return [*self.allied_units(team), *self.allied_towers(team)]

    def enemy_actors(self, team: str) -> List[Actor]:
        return [*self.enemy_units(team), *self.enemy_towers(team)]

    def allied_units(self, team: str) -> List[Unit]:
        return [u for u in self.units if u.team == team and u.alive]

    def enemy_units(self, team: str) -> List[Unit]:
        other = TEAM_BOT if team == TEAM_PLAYER else TEAM_PLAYER
        return [u for u in self.units if u.team == other and u.alive]

    def allied_towers(self, team: str) -> List[Tower]:
        return [t for t in self.towers if t.team == team and t.alive]

    def enemy_towers(self, team: str) -> List[Tower]:
        other = TEAM_BOT if team == TEAM_PLAYER else TEAM_PLAYER
        return [t for t in self.towers if t.team == other and t.alive]

    def spawn_unit(self, kind: str, team: str, lane: int) -> bool:
        stats = UNIT_TYPES[kind]
        if team == TEAM_PLAYER:
            if self.player_elixir < stats.cost:
                return False
            self.player_elixir -= stats.cost
            x = 250
            y = LANES[lane] + random.uniform(-16, 16)
        else:
            if self.bot_elixir < stats.cost:
                return False
            self.bot_elixir -= stats.cost
            x = WIDTH - 250
            y = LANES[lane] + random.uniform(-16, 16)

        self.units.append(Unit(kind, team, x, y, lane))
        return True

    def update(self, dt: float) -> None:
        if self.over:
            return

        self.time_left = max(0, self.time_left - dt)

        regen = 0.82 + (1.2 if self.time_left <= 60 else 0)
        self.player_elixir = min(self.max_elixir, self.player_elixir + regen * dt)
        bot_regen_bonus = self.level["bot_elixir_bonus"]
        self.bot_elixir = min(self.max_elixir, self.bot_elixir + (regen + bot_regen_bonus) * dt)

        self._update_bot_ai(dt)

        for tower in self.towers:
            tower.step(dt, self)
        for unit in self.units:
            unit.step(dt, self)
        for proj in self.projectiles:
            proj.update(dt, self)

        self.units = [u for u in self.units if u.alive]
        self.projectiles = [p for p in self.projectiles if p.alive]

        self._cleanup_destroyed_towers()
        self._resolve_end_state()

    def _cleanup_destroyed_towers(self) -> None:
        for tower in self.towers:
            if tower.alive:
                continue
            if tower.team == TEAM_PLAYER and tower.name == "Princess" and tower.health > -5000:
                self.bot_score += 1
                tower.health = -9999
                self.log_lines.append("Enemy destroyed your Princess Tower!")
            elif tower.team == TEAM_BOT and tower.name == "Princess" and tower.health > -5000:
                self.player_score += 1
                tower.health = -9999
                self.log_lines.append("You destroyed an enemy Princess Tower!")

    def _resolve_end_state(self) -> None:
        player_king = next((t for t in self.towers if t.team == TEAM_PLAYER and t.name == "King"), None)
        bot_king = next((t for t in self.towers if t.team == TEAM_BOT and t.name == "King"), None)
        if player_king and not player_king.alive:
            self.over = True
            self.winner = TEAM_BOT
            return
        if bot_king and not bot_king.alive:
            self.over = True
            self.winner = TEAM_PLAYER
            return

        if self.time_left <= 0:
            self.over = True
            if self.player_score > self.bot_score:
                self.winner = TEAM_PLAYER
            elif self.bot_score > self.player_score:
                self.winner = TEAM_BOT
            else:
                # tiebreak by king health
                p_hp = player_king.health if player_king else 0
                b_hp = bot_king.health if bot_king else 0
                if p_hp > b_hp:
                    self.winner = TEAM_PLAYER
                elif b_hp > p_hp:
                    self.winner = TEAM_BOT
                else:
                    self.winner = "draw"

    def _update_bot_ai(self, dt: float) -> None:
        if self.over:
            return

        self.bot_spawn_timer -= dt
        if self.bot_spawn_timer > 0:
            return

        pressure = [0.0, 0.0, 0.0]
        for lane in range(3):
            player_units = [u for u in self.units if u.team == TEAM_PLAYER and u.lane == lane]
            bot_units = [u for u in self.units if u.team == TEAM_BOT and u.lane == lane]
            pressure[lane] = (sum(u.health for u in player_units) - sum(u.health for u in bot_units)) / 300

        lane = max(range(3), key=lambda i: pressure[i] + random.uniform(-0.8, 0.8))

        skill = self.level["bot_skill"]
        options = ["knight", "archer", "bomber"]
        if random.random() < 0.4 * skill:
            options.append("wizard")
        if random.random() < 0.36 * skill:
            options.append("giant")
        if random.random() < 0.22 * skill:
            options.append("healer")

        kind = random.choice(options)
        cost = UNIT_TYPES[kind].cost

        if self.bot_elixir >= cost:
            self.spawn_unit(kind, TEAM_BOT, lane)
            if random.random() < 0.34 * skill and self.bot_elixir >= 3:
                backup_lane = lane if random.random() < 0.66 else random.randrange(3)
                self.spawn_unit(random.choice(["knight", "archer", "bomber"]), TEAM_BOT, backup_lane)

        self.bot_spawn_timer = random.uniform(max(0.8, 2.2 - skill), max(1.8, 3.0 - skill * 0.5))


class UI:
    def __init__(self):
        pygame.font.init()
        self.h1 = pygame.font.SysFont("arial", 34, bold=True)
        self.h2 = pygame.font.SysFont("arial", 24, bold=True)
        self.body = pygame.font.SysFont("arial", 18)
        self.small = pygame.font.SysFont("arial", 15)

        self.cards = ["knight", "archer", "giant", "wizard", "healer", "bomber"]
        self.card_rects: List[pygame.Rect] = []
        self.selected_card = 0

    def draw_world(self, screen: pygame.Surface, world: GameWorld) -> None:
        theme = world.level["theme"]
        screen.fill(theme["bg"])

        pygame.draw.rect(screen, theme["platform"], (0, GROUND_TOP, WIDTH, GROUND_BOTTOM - GROUND_TOP), border_radius=32)

        # river + bridges
        pygame.draw.rect(screen, theme["river"], (RIVER_X - 60, GROUND_TOP, 120, GROUND_BOTTOM - GROUND_TOP), border_radius=22)
        for y in LANES:
            pygame.draw.rect(screen, theme["bridge"], (RIVER_X - 72, y - 26, 144, 52), border_radius=12)
            pygame.draw.line(screen, (255, 240, 220), (RIVER_X - 64, y), (RIVER_X + 64, y), 2)

        # lane lines
        for y in LANES:
            pygame.draw.line(screen, (255, 255, 255, 120), (90, y), (WIDTH - 90, y), 1)

        for tower in world.towers:
            tower.draw(screen)
        for unit in world.units:
            unit.draw(screen)
        for projectile in world.projectiles:
            projectile.draw(screen)

        self.draw_top_hud(screen, world)
        self.draw_bottom_hud(screen, world)
        self.draw_logs(screen, world)

        if world.over:
            self.draw_end_banner(screen, world)

    def draw_top_hud(self, screen: pygame.Surface, world: GameWorld) -> None:
        panel = pygame.Rect(16, 12, WIDTH - 32, 94)
        pygame.draw.rect(screen, (255, 255, 255), panel, border_radius=15)
        pygame.draw.rect(screen, (213, 223, 245), panel, width=2, border_radius=15)

        lvl_text = self.h2.render(f"Level {world.level_id}: {world.level['name']}", True, (33, 43, 62))
        screen.blit(lvl_text, (32, 22))

        minutes = int(world.time_left) // 60
        seconds = int(world.time_left) % 60
        timer = self.h1.render(f"{minutes}:{seconds:02d}", True, (29, 37, 57))
        screen.blit(timer, (WIDTH // 2 - timer.get_width() // 2, 22))

        crowns = self.h2.render(f"👑 {world.player_score} - {world.bot_score} 👑", True, (48, 64, 102))
        screen.blit(crowns, (WIDTH // 2 - crowns.get_width() // 2, 62))

        p_elixir = self.body.render(f"You: {world.player_elixir:.1f} elixir", True, BLUE)
        b_elixir = self.body.render(f"Bot: {world.bot_elixir:.1f} elixir", True, RED)
        screen.blit(p_elixir, (WIDTH - 280, 27))
        screen.blit(b_elixir, (WIDTH - 280, 54))

    def draw_bottom_hud(self, screen: pygame.Surface, world: GameWorld) -> None:
        panel = pygame.Rect(0, HEIGHT - 150, WIDTH, 150)
        pygame.draw.rect(screen, (23, 30, 46), panel)
        pygame.draw.line(screen, (72, 90, 124), (0, HEIGHT - 150), (WIDTH, HEIGHT - 150), 2)

        hint = self.body.render(
            "Spawn: 1-6 select card • Q/W/E lane • Left click lane • Space pause • R restart",
            True,
            (203, 217, 242),
        )
        screen.blit(hint, (20, HEIGHT - 136))

        self.card_rects = []
        card_w, card_h, gap = 170, 90, 14
        start_x = 22
        y = HEIGHT - 115
        for i, kind in enumerate(self.cards):
            x = start_x + i * (card_w + gap)
            rect = pygame.Rect(x, y, card_w, card_h)
            self.card_rects.append(rect)
            stats = UNIT_TYPES[kind]

            active = i == self.selected_card
            affordable = world.player_elixir >= stats.cost
            base_col = (69, 84, 120) if affordable else (52, 60, 82)
            if active:
                base_col = (94, 124, 198) if affordable else (90, 82, 110)

            pygame.draw.rect(screen, base_col, rect, border_radius=12)
            pygame.draw.rect(screen, (140, 164, 220), rect, 2, border_radius=12)

            name = self.body.render(stats.name, True, WHITE)
            cost = self.body.render(f"{stats.cost}⚡", True, YELLOW)
            hp = self.small.render(f"HP {int(stats.health)}", True, (202, 216, 240))
            dmg = self.small.render(f"DMG {int(stats.damage) if stats.damage > 0 else 'Heal'}", True, (202, 216, 240))
            screen.blit(name, (x + 12, y + 10))
            screen.blit(cost, (x + card_w - cost.get_width() - 12, y + 10))
            screen.blit(hp, (x + 12, y + 42))
            screen.blit(dmg, (x + 12, y + 62))

    def draw_logs(self, screen: pygame.Surface, world: GameWorld) -> None:
        if not world.log_lines:
            return
        recent = world.log_lines[-4:]
        x, y = 20, 116
        for line in recent:
            txt = self.small.render(line, True, (40, 54, 86))
            screen.blit(txt, (x, y))
            y += 18

    def draw_end_banner(self, screen: pygame.Surface, world: GameWorld) -> None:
        overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        overlay.fill((12, 18, 31, 146))
        screen.blit(overlay, (0, 0))

        box = pygame.Rect(WIDTH // 2 - 280, HEIGHT // 2 - 120, 560, 240)
        pygame.draw.rect(screen, (245, 248, 255), box, border_radius=18)
        pygame.draw.rect(screen, (115, 143, 210), box, 2, border_radius=18)

        if world.winner == TEAM_PLAYER:
            title = "Victory!"
            color = BLUE
        elif world.winner == TEAM_BOT:
            title = "Defeat"
            color = RED
        else:
            title = "Draw"
            color = PURPLE

        t1 = self.h1.render(title, True, color)
        t2 = self.h2.render(f"Final Crowns: {world.player_score} - {world.bot_score}", True, BLACK)
        t3 = self.body.render("Press N for next level, R to replay, or ESC to quit.", True, (49, 60, 82))

        screen.blit(t1, (box.centerx - t1.get_width() // 2, box.y + 44))
        screen.blit(t2, (box.centerx - t2.get_width() // 2, box.y + 98))
        screen.blit(t3, (box.centerx - t3.get_width() // 2, box.y + 150))


class ClashGame:
    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("Clash of Clans - Pygame Arena")
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        self.clock = pygame.time.Clock()

        self.ui = UI()
        self.level = 1
        self.world = GameWorld(self.level)

        self.running = True
        self.paused = False
        self.selected_lane = 1

    def reset(self, level: Optional[int] = None) -> None:
        if level is not None:
            self.level = level
        self.world = GameWorld(self.level)
        self.paused = False

    def run(self) -> None:
        while self.running:
            dt = self.clock.tick(FPS) / 1000.0
            self.handle_events()
            if not self.paused and not self.world.over:
                self.world.update(dt)

            self.ui.draw_world(self.screen, self.world)
            self.draw_lane_selector()
            pygame.display.flip()

        pygame.quit()

    def draw_lane_selector(self) -> None:
        for i, y in enumerate(LANES):
            x = 118
            color = (246, 252, 255) if i == self.selected_lane else (222, 234, 250)
            border = BLUE if i == self.selected_lane else (120, 141, 180)
            pygame.draw.circle(self.screen, color, (x, y), 19)
            pygame.draw.circle(self.screen, border, (x, y), 19, 3)
            txt = self.ui.small.render(str(i + 1), True, (36, 51, 82))
            self.screen.blit(txt, (x - txt.get_width() // 2, y - txt.get_height() // 2))

        lane_hint = self.ui.small.render("Lane", True, (36, 54, 88))
        self.screen.blit(lane_hint, (98, 178))

        if self.paused and not self.world.over:
            pause = self.ui.h2.render("Paused", True, (32, 42, 66))
            self.screen.blit(pause, (WIDTH // 2 - pause.get_width() // 2, 112))

    def handle_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                return

            if event.type == pygame.KEYDOWN:
                self.handle_key(event.key)

            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                self.handle_mouse(event.pos)

    def handle_key(self, key: int) -> None:
        if key == pygame.K_ESCAPE:
            self.running = False
            return
        if key == pygame.K_SPACE:
            self.paused = not self.paused
            return
        if key == pygame.K_r:
            self.reset(self.level)
            return
        if key == pygame.K_n and self.world.over:
            next_level = self.level + 1
            if next_level > max(LEVELS):
                next_level = 1
            self.reset(next_level)
            return

        lane_map = {pygame.K_q: 0, pygame.K_w: 1, pygame.K_e: 2, pygame.K_1: 0, pygame.K_2: 1, pygame.K_3: 2}
        if key in lane_map:
            self.selected_lane = lane_map[key]
            return

        card_map = {
            pygame.K_1: 0,
            pygame.K_2: 1,
            pygame.K_3: 2,
            pygame.K_4: 3,
            pygame.K_5: 4,
            pygame.K_6: 5,
        }
        if key in card_map:
            self.ui.selected_card = card_map[key]
            return

        if key in (pygame.K_RETURN, pygame.K_f):
            self.try_spawn(self.selected_lane)

    def handle_mouse(self, pos: Tuple[int, int]) -> None:
        if self.world.over:
            return

        x, y = pos

        for i, rect in enumerate(self.ui.card_rects):
            if rect.collidepoint(pos):
                self.ui.selected_card = i
                return

        # lane click region
        if 72 <= x <= 220 and GROUND_TOP <= y <= GROUND_BOTTOM:
            lane = min(range(3), key=lambda i: abs(LANES[i] - y))
            self.selected_lane = lane
            self.try_spawn(lane)
            return

        # direct board click to deploy near lane
        if 210 <= x <= 430 and GROUND_TOP <= y <= GROUND_BOTTOM:
            lane = min(range(3), key=lambda i: abs(LANES[i] - y))
            self.selected_lane = lane
            self.try_spawn(lane)

    def try_spawn(self, lane: int) -> None:
        if self.paused:
            return
        kind = self.ui.cards[self.ui.selected_card]
        ok = self.world.spawn_unit(kind, TEAM_PLAYER, lane)
        if not ok:
            self.world.log_lines.append("Not enough elixir for that card.")


def main() -> int:
    game = ClashGame()
    game.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
