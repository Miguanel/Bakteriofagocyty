// static/js/Graphics.js
import { ctx } from './Canvas.js';
import { UNIT_TYPES } from './constants.js';

export function drawUnitVisuals(unit, alpha, isHurt) {
    const stats = UNIT_TYPES[unit.type];
    if (!stats) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. TŁO
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
    ctx.fillStyle = isHurt ? '#ffffff' : unit.baseColor;
    ctx.fill();

    ctx.strokeStyle = unit.factionColor || '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. GŁÓWNA IKONA
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let displayIcon = stats.icon;
    if (unit.isDormant) displayIcon = '💤';

    const hasBuffs = unit.activeBuffs && unit.activeBuffs.length > 0;
    const yOffset = hasBuffs ? -unit.radius * 0.3 : 0;
    const fontSize = unit.radius * 1.0;

    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(displayIcon, unit.x, unit.y + yOffset);

    // --- 3. LISTA BONUSÓW (Z GRUPOWANIEM) ---
    if (hasBuffs) {
        // A. Grupowanie ikon (liczenie powtórzeń)
        const buffCounts = {};
        unit.activeBuffs.forEach(icon => {
            buffCounts[icon] = (buffCounts[icon] || 0) + 1;
        });

        const uniqueIcons = Object.keys(buffCounts);
        const buffCount = uniqueIcons.length;

        const buffSize = unit.radius * 0.35;
        const spacing = buffSize * 1.8; // Większy odstęp na cyferki

        ctx.font = `${buffSize}px Arial`;
        const buffY = unit.y + unit.radius * 0.45;

        uniqueIcons.forEach((icon, index) => {
            const count = buffCounts[icon];
            const offsetX = (index - (buffCount - 1) / 2) * spacing;
            const drawX = unit.x + offsetX;

            // Rysujemy ikonę
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(icon, drawX, buffY);

            // Rysujemy licznik, jeśli > 1
            if (count > 1) {
                ctx.font = `bold ${buffSize * 0.7}px Arial`;
                ctx.fillStyle = '#f1c40f'; // Złoty kolor dla licznika
                // Rysujemy cyferkę w prawym dolnym rogu ikony
                ctx.fillText(`x${count}`, drawX + buffSize * 0.6, buffY + buffSize * 0.3);

                // Przywracamy czcionkę dla kolejnej pętli
                ctx.font = `${buffSize}px Arial`;
            }
        });
    }

    // 4. STATYSTYKI (Bez zmian)
    ctx.font = 'bold 13px Verdana';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';
    const statDist = unit.radius * 1.2;
    const offsetXY = statDist * 0.707;

    if (!unit.isDormant) {
        const atkText = `⚔️${unit.atk}`;
        ctx.strokeText(atkText, unit.x + offsetXY, unit.y - offsetXY);
        ctx.fillStyle = '#ffeba7';
        ctx.fillText(atkText, unit.x + offsetXY, unit.y - offsetXY);
    }

    const hpText = `❤️${Math.ceil(unit.hp)}`;
    ctx.strokeText(hpText, unit.x - offsetXY, unit.y + offsetXY);
    ctx.fillStyle = unit.isDormant ? '#bdc3c7' : '#ffffff';
    ctx.fillText(hpText, unit.x - offsetXY, unit.y + offsetXY);

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