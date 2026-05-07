import { ctx } from './Canvas.js';
import { UNIT_TYPES } from './constants.js';

export function drawUnitVisuals(unit, alpha, isHurt) {
    const stats = UNIT_TYPES[unit.type];
    if (!stats) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.shadowBlur = 15;
    ctx.shadowColor = unit.factionColor;

    // --- ORGANICZNY KORPUS ---
    ctx.beginPath();

    const points = 36;
    const time = Date.now() / 1000;
    const isDormant = unit.isDormant || stats.baseSpeed === 0;
    const seed = (unit.x * 12.3) + (unit.y * 7.7);

    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        let wobble = 0;

        let freq1 = 4;
        let freq2 = 3;
        let speedModifier = 0.5 + (unit.baseSpeed * 0.05);
        let amp = unit.radius * 0.12;

        // --- ZMIANA: Leniwa, powolna Ameba ---
        if (unit.type === 'amoeba') {
            freq1 = 3; // Mniej wcięć (bardziej zaokrąglona)
            freq2 = 2;
            speedModifier = 0.05; // Bardzo powolne przesunięcie (brak efektu szybkiego kręcenia)
            amp = unit.radius * 0.15; // Mniejsze wygięcie
        }

        if (!isDormant) {
            wobble = Math.sin(angle * freq1 + (time * speedModifier) + seed) * amp +
                     Math.cos(angle * freq2 - (time * speedModifier * 0.8) + seed) * (amp * 0.5);
        } else {
            amp = unit.radius * 0.03;
            wobble = Math.sin(angle * 4 + (time * 0.3) + seed) * amp;
        }

        const r = unit.radius + wobble;
        const px = unit.x + Math.cos(angle) * r;
        const py = unit.y + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = isHurt ? '#fff' : unit.baseColor;
    ctx.fill();

    ctx.strokeStyle = unit.factionColor;
    ctx.lineWidth = Math.max(3, unit.radius * 0.1);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${unit.radius * 0.9}px Arial`;
    ctx.fillText(unit.isDormant ? '💤' : stats.icon, unit.x, unit.y);

    ctx.font = 'bold 12px Orbitron, sans-serif';
    ctx.fillStyle = "#fff";
    ctx.fillText(`⚔️${Math.ceil(unit.atk)}`, unit.x + unit.radius, unit.y - unit.radius);
    ctx.fillText(`❤️${Math.ceil(unit.hp)}`, unit.x - unit.radius, unit.y + unit.radius);

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