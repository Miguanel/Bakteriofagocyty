// static/js/Graphics.js
import { ctx } from './Canvas.js';
import { UNIT_TYPES } from './constants.js';

export function drawUnitVisuals(unit, alpha, isHurt) {
    const stats = UNIT_TYPES[unit.type];
    if (!stats) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Poświata neonowa wokół jednostki
    ctx.shadowBlur = 15;
    ctx.shadowColor = unit.factionColor;

    // 1. KORPUS
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
    ctx.fillStyle = isHurt ? '#fff' : unit.baseColor;
    ctx.fill();

    // Obramowanie w kolorze frakcji (Komandor/Obcy)
    ctx.strokeStyle = unit.factionColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. IKONA
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${unit.radius}px Arial`;
    ctx.fillText(unit.isDormant ? '💤' : stats.icon, unit.x, unit.y);

    // 3. STATYSTYKI
    ctx.font = 'bold 12px Orbitron, sans-serif';
    ctx.fillStyle = "#fff";
    ctx.fillText(`⚔️${unit.atk}`, unit.x + unit.radius, unit.y - unit.radius);
    ctx.fillText(`❤️${Math.ceil(unit.hp)}`, unit.x - unit.radius, unit.y + unit.radius);

    ctx.restore();
}


// Funkcja strzałki bez zmian, ale musi być wyeksportowana
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