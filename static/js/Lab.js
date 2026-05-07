import { state } from './GameState.js';
import { canvas, ctx } from './Canvas.js';
import { resolveCollisions, resolveCircularBounds } from './Physics.js';
import { renderHands, updateUI } from './UI.js';
import { UNIT_TYPES, MUTATION_TYPES } from './constants.js';

let heldUnit = null;
let hoveredUnit = null; // Śledzi aktualnie "zamrożoną" jednostkę
let mousePos = { x: -1000, y: -1000 };

export function drawPetriDish() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 200;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 40, 50, 0.4)';
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#34495e';
    ctx.stroke();

    const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
}

export function labLoop(deltaTime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPetriDish();

    const currentLabUnits = state.labUnits[state.activePlayerId] || [];

    // Jeśli kursor jest nad jakąkolwiek jednostką, cała szalka pauzuje!
    const isPausedByHover = hoveredUnit !== null;

    if (!state.dragPreview && !heldUnit && !isPausedByHover) {
        const STEPS = 4;
        const subDeltaTime = deltaTime / STEPS;
        const moveStep = 1.0 / STEPS;

        for (let i = 0; i < STEPS; i++) {
            resolveCollisions(currentLabUnits);
            resolveCircularBounds(currentLabUnits);
            currentLabUnits.forEach(u => u.update(subDeltaTime, moveStep));
        }
    }

    ctx.save();
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";

    if (state.dragPreview) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("UPUŚĆ KARTĘ ABY ZMUTOWAĆ", canvas.width / 2, 50);
    } else if (heldUnit) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("PRZECIĄGNIJ NA DÓŁ ABY ZAPISAĆ", canvas.width / 2, 50);
    } else if (isPausedByHover) {
        // Delikatna wizualizacja, że gra jest zapauzowana (np. mruganie krawędzi)
        ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
        ctx.fillText("SKANOWANIE...", canvas.width / 2, 50);
    }
    ctx.restore();

    currentLabUnits.forEach(u => u.draw());

    if (heldUnit) {
        ctx.save();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(heldUnit.x, heldUnit.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        ctx.restore();
    }
}

export function handleLabInteraction(type, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    mousePos = { x: mx, y: my };

    const currentLabUnits = state.labUnits[state.activePlayerId] || [];
    const tooltip = document.getElementById('unit-hover-tooltip');

    if (type === 'mousemove') {
        let foundHover = null;

        // Szukamy, czy myszka nie najechała na jakiś mikrob (zwiększony margines detekcji +20)
        for (let i = currentLabUnits.length - 1; i >= 0; i--) {
            const u = currentLabUnits[i];
            const dist = Math.hypot(u.x - mx, u.y - my);
            if (dist < u.radius + 20) {
                foundHover = u;
                break;
            }
        }

        hoveredUnit = foundHover;

        if (hoveredUnit && !heldUnit && !state.dragPreview) {
            // Wypełnianie tooltipu danymi
            const stats = document.getElementById('tooltip-stats');
            const typeInfo = UNIT_TYPES[hoveredUnit.type];
            const mutNames = hoveredUnit.appliedMutations.length > 0 ?
                hoveredUnit.appliedMutations.map(m => MUTATION_TYPES[m] ? MUTATION_TYPES[m].label : m).join(', ') : 'Brak';

            stats.innerHTML = `
                <div style="font-size:16px; margin-bottom:5px; color:${typeInfo.color}; text-transform:uppercase;"><b>${hoveredUnit.type} ${typeInfo.icon}</b></div>
                <div>⚔️ Atak: <span style="color:#ff7675">${hoveredUnit.atk}</span></div>
                <div>❤️ HP: <span style="color:#55efc4">${Math.ceil(hoveredUnit.hp)}</span></div>
                <div style="margin-top:5px; color:#bdc3c7;">🧬 Geny:<br>${mutNames}</div>
            `;

            // Ustawianie pozycji tooltipa (używamy realnych pikseli ekranu, nie płótna)
            tooltip.style.left = (rect.left + (hoveredUnit.x / scaleX)) + 'px';
            tooltip.style.top = (rect.top + (hoveredUnit.y / scaleY)) + 'px';
            tooltip.style.display = 'block';

            // Zapewniamy, że przycisk wewnątrz tooltipa wie, kogo pobrać
            const btnExtract = document.getElementById('tooltip-extract-btn');
            btnExtract.onclick = () => saveUnitToDeck(hoveredUnit);

        } else {
            // Chowamy tooltip, jeśli mysz uciekła
            // UWAGA: Sprawdzamy czy mysz nie najechała przypadkiem na sam Tooltip!
            const isHoveringTooltip = document.elementFromPoint(e.clientX, e.clientY)?.closest('#unit-hover-tooltip');
            if(!isHoveringTooltip) {
                tooltip.style.display = 'none';
            }
        }

        if (heldUnit) {
            heldUnit.x = mx; heldUnit.y = my; heldUnit.vx = 0; heldUnit.vy = 0;
            tooltip.style.display = 'none'; // Chowamy przy przeciąganiu
        }
    }
    else if (type === 'mousedown') {
        if (hoveredUnit && !document.elementFromPoint(e.clientX, e.clientY)?.closest('#unit-hover-tooltip')) {
            heldUnit = hoveredUnit;
            tooltip.style.display = 'none'; // Przenosimy, więc znikamy tooltip
        }
    }
    else if (type === 'mouseup') {
        if (heldUnit) {
            const isOverDeck = my > canvas.height - 120;
            if (isOverDeck) saveUnitToDeck(heldUnit);
            heldUnit = null;
        }
    }
}

// Funkcję przeniosłem do eksportu, aby przycisk w głównym DOM mógł ją wywołać
export function saveUnitToDeck(unit) {
    state.labUnits[state.activePlayerId] = state.labUnits[state.activePlayerId].filter(u => u !== unit);
    const newCard = {
        category: 'unit', type: unit.type,
        savedMutations: unit.appliedMutations ? [...unit.appliedMutations] : []
    };
    state.hands[state.activePlayerId].push(newCard);

    // Zresetuj tooltip i zaznaczenie
    document.getElementById('unit-hover-tooltip').style.display = 'none';
    hoveredUnit = null;

    renderHands();
    updateUI();
}