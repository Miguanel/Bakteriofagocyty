import { state } from './GameState.js';
import { canvas, ctx } from './Canvas.js';
import { resolveCollisions, resolveCircularBounds } from './Physics.js';
import { renderHands, updateUI, showDamageNumber } from './UI.js';
import { UNIT_TYPES, MUTATION_TYPES } from './constants.js';

let heldUnit = null;
let hoveredUnit = null;
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

    // --- FIZYKA: Komórki swobodnie pływają, bez zamrażania! ---
    if (!state.dragPreview && !heldUnit && !state.isLabPaused) {
        const STEPS = 4;
        const subDeltaTime = deltaTime / STEPS;
        const moveStep = 1.0 / STEPS;

        for (let i = 0; i < STEPS; i++) {
            resolveCollisions(currentLabUnits);
            resolveCircularBounds(currentLabUnits);
            currentLabUnits.forEach(u => u.update(subDeltaTime, moveStep));
        }
    }

    // Teksty informacyjne
    ctx.save();
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";

    if (state.dragPreview) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("UPUŚĆ GEN ABY ZMUTOWAĆ", canvas.width / 2, 50);
    } else if (heldUnit) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("PRZECIĄGNIJ W DÓŁ ABY POBRAĆ", canvas.width / 2, 50);
    } else if (state.isLabPaused) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText("SZALKA ZAMROŻONA", canvas.width / 2, 50);
    }
    ctx.restore();

    // Rysowanie komórek z podświetleniem aury
    currentLabUnits.forEach(u => {
        if (state.dragPreview && state.dragPreview.targetUnit === u) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(u.x, u.y, u.radius + 15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.fill();
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.restore();
        }
        else if ((u === hoveredUnit || u === state.hoveredUnitFromUI) && !heldUnit && !state.dragPreview) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(u.x, u.y, u.radius + 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.restore();
        }

        u.draw();
    });

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

    mousePos.x = (e.clientX - rect.left) * scaleX;
    mousePos.y = (e.clientY - rect.top) * scaleY;

    const currentLabUnits = state.labUnits[state.activePlayerId] || [];

    if (type === 'mousemove') {
        let foundHover = null;
        let minDist = Infinity;

        for (let i = currentLabUnits.length - 1; i >= 0; i--) {
            const u = currentLabUnits[i];
            const dist = Math.hypot(u.x - mousePos.x, u.y - mousePos.y);

            if (dist < u.radius + 15 && dist < minDist) {
                foundHover = u;
                minDist = dist;
            }
        }
        hoveredUnit = foundHover;

        if (heldUnit) {
            heldUnit.x = mousePos.x; heldUnit.y = mousePos.y; heldUnit.vx = 0; heldUnit.vy = 0;
        }
    }
    else if (type === 'mousedown') {
        if (hoveredUnit) heldUnit = hoveredUnit;
    }
    else if (type === 'mouseup') {
        if (heldUnit) {
            const isOverDeck = mousePos.y > canvas.height - 120;
            if (isOverDeck) saveUnitToDeck(heldUnit);
            heldUnit = null;
        }
    }
}

export function saveUnitToDeck(unit) {
    state.labUnits[state.activePlayerId] = state.labUnits[state.activePlayerId].filter(u => u !== unit);
    const newCard = {
        category: 'unit', type: unit.type,
        savedMutations: unit.appliedMutations ? [...unit.appliedMutations] : []
    };
    state.hands[state.activePlayerId].push(newCard);
    hoveredUnit = null;
    renderHands();
    updateUI();
}