import { ctx } from './Canvas.js';
import { UNIT_TYPES } from './constants.js';

export function drawUnitVisuals(unit, alpha, isHurt) {
    const stats = UNIT_TYPES[unit.type];
    if (!stats) return;

    // --- NOWOŚĆ: Wizualizacja Rdzenia (Kopiowanie Minimapy) ---
    if (unit.type === 'core_base') {
        const minimapId = unit.owner === 'player' ? 'minimapCanvas-p1' : 'minimapCanvas-p2';
        const minimap = document.getElementById(minimapId);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Czerwone/Białe mignięcie od obrażeń
        if (isHurt) {
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, unit.radius + 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);

        ctx.shadowBlur = 25;
        ctx.shadowColor = unit.factionColor;
        ctx.strokeStyle = unit.factionColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.clip(); // Ucinamy wszystko co wyjdzie poza idealne koło

        if (minimap) {
            // Wklejamy Radar Labu dokładnie w środek naszej bazy
            ctx.drawImage(minimap, unit.x - unit.radius, unit.y - unit.radius, unit.radius * 2, unit.radius * 2);
        }

        ctx.restore();

        // Podpis HP nad/pod stacją
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Orbitron, sans-serif';
        ctx.fillStyle = "#fff";
        const yOffset = unit.owner === 'player' ? -unit.radius - 12 : unit.radius + 12;
        ctx.fillText(`❤️ ${Math.ceil(unit.hp)}`, unit.x, unit.y + yOffset);

        return; // Zamykamy tutaj – rdzeń się nie wygina jak inne ameby.
    }

    // --- Zwykłe Komórki (Twój świetny fizyczny silnik błony) ---
    ctx.save();
    ctx.globalAlpha = alpha;

    const time = Date.now() / 1000;
    const seed = (unit.x * 12.3) + (unit.y * 7.7);
    const isDormant = unit.isDormant || stats.baseSpeed === 0;

    const muts = unit.appliedMutations || [];
    const hasFlagella = muts.includes('FLAGELLA');
    const hasSpikes = muts.includes('SPIKED_ARMOR');
    const hasWall = muts.includes('CELL_WALL');
    const hasLipids = muts.includes('LIPIDS');
    const hasTank = muts.includes('TANK_DNA');
    const hasSymbiosis = muts.includes('SYMBIOSIS');
    const hasChloroplasts = muts.includes('CHLOROPLASTS');
    const hasSlime = muts.includes('SLIME_CAPSULE');
    const hasToxin = muts.includes('TOXIN_PLASMID');

    let moveAngle = Math.atan2(unit.vy, unit.vx);
    if (Math.hypot(unit.vx, unit.vy) < 0.1) moveAngle = unit.angle || 0;

    if (hasSlime) {
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, unit.radius + 12 + Math.sin(time * 3 + seed) * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 206, 209, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 206, 209, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    if (hasFlagella && !isDormant) {
        ctx.beginPath();
        ctx.strokeStyle = unit.factionColor;
        ctx.lineWidth = 2.5;
        for(let w = -1; w <= 1; w++) {
            const backAngle = moveAngle + Math.PI + (w * 0.4);
            const startX = unit.x + Math.cos(backAngle) * unit.radius;
            const startY = unit.y + Math.sin(backAngle) * unit.radius;
            const wave = Math.sin(time * 15 + seed + w * 2) * 12;
            const endX = startX + Math.cos(backAngle) * 25 + Math.cos(backAngle + Math.PI/2) * wave;
            const endY = startY + Math.sin(backAngle) * 25 + Math.sin(backAngle + Math.PI/2) * wave;

            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(
                startX + Math.cos(backAngle) * 10, startY + Math.sin(backAngle) * 10 + wave * 1.5,
                endX, endY
            );
        }
        ctx.stroke();
    }

    if (hasSymbiosis) {
        const symAngle = moveAngle + Math.PI / 2 + Math.sin(time)*0.5;
        const symX = unit.x + Math.cos(symAngle) * (unit.radius + 5);
        const symY = unit.y + Math.sin(symAngle) * (unit.radius + 5);

        ctx.beginPath();
        ctx.arc(symX, symY, unit.radius * 0.35 + Math.sin(time*4)*2, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        ctx.strokeStyle = unit.factionColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.shadowBlur = 15;
    ctx.shadowColor = hasToxin ? '#9b59b6' : unit.factionColor;

    ctx.beginPath();
    const points = 50;

    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        let wobble = 0;
        let amp = unit.radius * 0.12;

        if (unit.type === 'amoeba') {
            amp = unit.radius * 0.15;
            if (!isDormant) {
                wobble = Math.sin(angle * 3 + (time * 0.05) + seed) * amp +
                         Math.cos(angle * 2 - (time * 0.04) + seed) * (amp * 0.5);
            }
        } else {
            if (!isDormant) {
                const speedMod = 0.5 + (unit.baseSpeed * 0.05);
                wobble = Math.sin(angle * 4 + (time * speedMod) + seed) * amp +
                         Math.cos(angle * 3 - (time * speedMod * 0.8) + seed) * (amp * 0.5);
            } else {
                amp = unit.radius * 0.03;
                wobble = Math.sin(angle * 4 + (time * 0.3) + seed) * amp;
            }
        }

        let r = unit.radius;

        if (hasSpikes) wobble += Math.abs(Math.sin(angle * 10 + time * 3)) * (unit.radius * 0.25);
        if (hasWall) wobble += Math.sign(Math.sin(angle * 6 + time)) * (unit.radius * 0.08);
        if (hasLipids) wobble += Math.cos(angle * 4 - time * 2) * (unit.radius * 0.2);

        if (hasTank) {
            let relAngle = angle - moveAngle;
            relAngle = Math.atan2(Math.sin(relAngle), Math.cos(relAngle));
            if (Math.abs(relAngle) < Math.PI / 3.5) {
                r += unit.radius * 0.3;
                wobble *= 0.15;
            }
        }

        r += wobble;

        const px = unit.x + Math.cos(angle) * r;
        const py = unit.y + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = isHurt ? '#fff' : unit.baseColor;
    ctx.fill();

    ctx.strokeStyle = unit.factionColor;
    ctx.lineWidth = hasTank ? Math.max(4, unit.radius * 0.15) : Math.max(3, unit.radius * 0.1);
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (hasChloroplasts) {
        for(let c = 0; c < 3; c++) {
            const cAngle = (Math.PI * 2 / 3) * c + time * 0.5;
            const cx = unit.x + Math.cos(cAngle) * (unit.radius * 0.45);
            const cy = unit.y + Math.sin(cAngle) * (unit.radius * 0.45);

            ctx.beginPath();
            ctx.arc(cx, cy, unit.radius * 0.18, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(46, 204, 113, 0.9)';
            ctx.fill();
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    if (hasToxin) {
        for(let t = 0; t < 2; t++) {
            const tAngle = time * 2 + Math.PI * t;
            const tx = unit.x + Math.sin(tAngle) * (unit.radius * 0.3);
            const ty = unit.y + Math.cos(tAngle) * (unit.radius * 0.3);

            ctx.beginPath();
            ctx.arc(tx, ty, unit.radius * 0.2 + Math.sin(time*10)*2, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(155, 89, 182, 0.8)';
            ctx.fill();
        }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${unit.radius * 0.9}px Arial`;
    ctx.fillText(unit.isDormant ? '💤' : stats.icon, unit.x, unit.y);

    ctx.font = 'bold 12px Orbitron, sans-serif';
    ctx.fillStyle = "#fff";
    ctx.fillText(`⚔️${Math.ceil(unit.atk)}`, unit.x + unit.radius, unit.y - unit.radius);

    ctx.restore();
}

export function drawVectorArrow(x, y, angle, alpha) {
    const length = 30;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
}