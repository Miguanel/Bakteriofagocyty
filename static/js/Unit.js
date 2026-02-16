import { UNIT_TYPES, PHASES, MUTATION_TYPES } from './constants.js';
import { state } from './GameState.js';
import { canvas } from './Canvas.js';
import { drawUnitVisuals, drawVectorArrow } from './Graphics.js';

export class Unit {
    constructor(x, y, type, owner, angleOverride) {
        this.x = x; this.y = y; this.type = type; this.owner = owner;
        const stats = UNIT_TYPES[type];
        this.radius = stats.radius; this.mass = stats.mass; this.baseSpeed = stats.baseSpeed;
        this.atk = stats.atk; this.maxHp = stats.hp; this.hp = stats.hp;
        this.damageCooldown = 0; this.isDormant = false; this.isDeadFlag = false;

        this.traits = {
            regeneration: false, thorns: false, agile: false,
            photosynthesis: 0, kamikaze: false, necromancy: false
        };

        this.activeBuffs = []; this.appliedMutations = [];
        this.factionColor = (this.owner === 'player') ? '#00a8ff' : '#e84118';
        this.baseColor = stats.color;
        this.angle = angleOverride;
        this.vx = Math.cos(this.angle) * this.baseSpeed;
        this.vy = Math.sin(this.angle) * this.baseSpeed;
    }

    applyGeneticCard(cardType) {
        if (MUTATION_TYPES[cardType]) this.activeBuffs.push(MUTATION_TYPES[cardType].icon);
        this.appliedMutations.push(cardType);

        switch (cardType) {
            case 'TANK_DNA': this.maxHp *= 1.5; this.hp *= 1.5; this.radius *= 1.2; this.mass *= 1.2; break;
            case 'REGEN_ENZYMES': this.traits.regeneration = true; break;
            case 'SPEED_BOOST': this.baseSpeed *= 1.4; break;
            case 'CELL_WALL': this.traits.thorns = true; break;
            case 'TOXIN_PLASMID': this.atk += 5; this.maxHp *= 0.7; this.hp = Math.max(1, this.hp * 0.7); break;
            case 'FLAGELLA': this.traits.agile = true; this.baseSpeed *= 1.2; break;
            case 'CHLOROPLASTS': this.traits.photosynthesis += 3; break;
            case 'APOPTOSIS': this.atk += 15; this.traits.kamikaze = true; break;
            case 'CORDYCEPS': this.traits.necromancy = true; break;
            case 'LIPIDS': this.mass *= 3.0; this.maxHp += 20; this.hp += 20; this.baseSpeed *= 0.1; break;
        }
    }

    draw() {
        drawUnitVisuals(this, 1.0, this.damageCooldown > 0);
        if (state.phase === PHASES.PLAYER_PLANNING && !this.isDormant && this.baseSpeed > 0) this.drawArrow();
    }

    drawArrow() { drawVectorArrow(this.x, this.y, Math.atan2(this.vy, this.vx), 1.0); }

    update(deltaTime, moveMultiplier = 1.0) {
        if (this.traits.regeneration && this.hp > 0 && !this.isDormant && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 0.05 * (deltaTime / 16));
        }
        if (this.damageCooldown > 0) this.damageCooldown -= deltaTime;

        // --- LOGIKA ŚMIERCI ---
        if (this.hp <= 0 && !this.isDeadFlag) {
            this.hp = 0;
            if (this.type === 'tardigrade' && !this.isDormant) {
                this.isDormant = true; this.atk = 0; this.baseColor = '#7f8c8d';
            } else {
                this.isDeadFlag = true;

                // WYPADA ENERGIA (tylko poza szalką laboratoryjną)
                if (state.phase !== 'LAB_MODE') {
                    const dropValue = Math.max(1, Math.floor(UNIT_TYPES[this.type].cost / 2));
                    // Bezpiecznik: jeśli tablica nie istnieje, tworzymy ją
                    if (!state.energyDrops) state.energyDrops = [];
                    state.energyDrops.push(new EnergyDrop(this.x, this.y, dropValue));
                }

                if (this.traits.necromancy) {
                    state.units.push(new Unit(this.x, this.y, 'virus', this.owner, Math.random() * Math.PI * 2));
                }
            }
        }

        let currentSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        if (currentSpeed > this.baseSpeed) {
            const friction = this.traits.agile ? 0.98 : 0.95;
            this.vx *= friction; this.vy *= friction;
        } else {
            if (currentSpeed < 0.1) currentSpeed = 0.1;
            const acceleration = this.traits.agile ? 1.15 : 1.05;
            this.vx *= acceleration; this.vy *= acceleration;
            const newSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
            if (newSpeed > this.baseSpeed && this.baseSpeed > 0) {
                this.vx = (this.vx / newSpeed) * this.baseSpeed;
                this.vy = (this.vy / newSpeed) * this.baseSpeed;
            }
        }

        if (this.baseSpeed < 0.5) { this.vx *= 0.9; this.vy *= 0.9; }

        this.x += this.vx * moveMultiplier;
        this.y += this.vy * moveMultiplier;

        if (this.x - this.radius < 0) { this.x = this.radius; this.vx = Math.abs(this.vx); }
        if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.vx = -Math.abs(this.vx); }
        if (this.y - this.radius < 0) { this.y = this.radius; this.vy = Math.abs(this.vy); }
        if (this.y + this.radius > canvas.height) { this.y = canvas.height - this.radius; this.vy = -Math.abs(this.vy); }
    }
}

// --- ZAKTUALIZOWANA, PULSUJĄCA KROPELKA ENERGII ---
export class EnergyDrop {
    constructor(x, y, amount) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.radius = 10;
        this.pulse = Math.random() * Math.PI * 2;

        // Efekt wyrzutu
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.pickupDelay = 60; // 1 sekunda opóźnienia, by dało się ją zauważyć
    }

    draw(ctx) {
        if (this.pickupDelay > 0) {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.92;
            this.vy *= 0.92;
            this.pickupDelay--;
        }

        this.pulse += 0.08;
        const outerHaloRadius = this.radius + 8 + Math.sin(this.pulse) * 6;
        const innerCoreRadius = this.radius + Math.sin(this.pulse) * 2;

        ctx.save();

        // Delikatne miganie, gdy nie można jeszcze podnieść
        if (this.pickupDelay > 0 && this.pickupDelay % 10 < 5) {
            ctx.globalAlpha = 0.5;
        }

        // Duża, miękka poświata
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, Math.max(1, outerHaloRadius));
        gradient.addColorStop(0, 'rgba(255, 241, 118, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, Math.max(1, outerHaloRadius), 0, Math.PI * 2);
        ctx.fill();

        // Jasny, neonowy środek
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, innerCoreRadius), 0, Math.PI * 2);
        ctx.fillStyle = '#fffce6';
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 25;
        ctx.fill();

        // Wyraźny symbol
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#d35400';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', this.x, this.y + 1);

        ctx.restore();
    }
}