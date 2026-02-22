import { state } from './GameState.js';
import { canvas, ctx } from './Canvas.js';
import { resolveCollisions, resolveCircularBounds } from './Physics.js';
import { renderHands, updateUI } from './UI.js';

let heldUnit = null;
let mousePos = { x: 0, y: 0 };

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

    // 1. Fizyka działa tylko gdy nic nie trzymamy i gra nie jest zapauzowana
    if (!state.dragPreview && !heldUnit && !state.isLabPaused) {
        const STEPS = 4;
        const subDeltaTime = deltaTime / STEPS;
        const moveStep = 1.0 / STEPS;

        for (let i = 0; i < STEPS; i++) {
            resolveCollisions();
            resolveCircularBounds();
            state.units.forEach(u => u.update(subDeltaTime, moveStep));
        }
    }

    // 2. Napisy informacyjne (Overlay)
    ctx.save();
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";

    // Wyświetlamy tylko jeden, najważniejszy komunikat na raz
    if (state.isExtractMode) {
        ctx.fillStyle = '#f1c40f'; // Żółty dla trybu ekstrakcji
        ctx.fillText("TRYB POBIERANIA: KLIKNIJ ISTOTĘ", canvas.width / 2, 80);
    } else if (state.dragPreview) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("UPUŚĆ KARTĘ ABY DODAĆ/ZMUTOWAĆ", canvas.width / 2, 50);
    } else if (heldUnit) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("PRZECIĄGNIJ NA DÓŁ ABY ZAPISAĆ DO TALII", canvas.width / 2, 50);
    } else if (state.isLabPaused) {
        ctx.fillStyle = '#e74c3c'; // Czerwony dla pauzy
        ctx.fillText("SZALKA ZATRZYMANA (WYBIERZ JEDNOSTKĘ)", canvas.width / 2, 50);
    }
    ctx.restore();

    state.units.forEach(u => u.draw());

    // 3. Wizualizacja przeciągania
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

    // --- NOWOŚĆ: Obliczanie skali płótna (naprawia przesunięcie kursora) ---
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Zastosowanie mnożnika skali do pozycji myszy
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    mousePos = { x: mx, y: my };

    if (type === 'mousedown') {
        for (let i = state.units.length - 1; i >= 0; i--) {
            const u = state.units[i];
            const dist = Math.hypot(u.x - mx, u.y - my);

            // Zwiększony margines kliknięcia (u.radius + 10) ułatwia obsługę na telefonie
            if (dist < u.radius + 10) {
                // LOGIKA POBIERANIA (Kliknięcie zamiast przeciągania)
                if (state.isExtractMode) {
                    saveUnitToDeck(u);
                    state.isExtractMode = false;

                    // Szukamy przycisku, by przywrócić mu pierwotny wygląd
                    const btn = document.getElementById('extract-btn');
                    if (btn) {
                        btn.style.background = '#27ae60';
                        btn.style.color = '#fff';
                        btn.innerHTML = "📥 POBIERZ";
                    }
                    return; // Ważne: wychodzimy, nie chcemy zaczynać przeciągania
                }

                // ZWYKŁY TRYB: Łapiemy jednostkę
                heldUnit = u;
                break;
            }
        }
    }
    else if (type === 'mousemove') {
        if (heldUnit) {
            heldUnit.x = mx;
            heldUnit.y = my;
            heldUnit.vx = 0;
            heldUnit.vy = 0;
        }
    }
    else if (type === 'mouseup') {
        if (heldUnit) {
            // Sprawdzamy czy jednostka została przeciągnięta poza dolną krawędź szalki
            const isOverDeck = my > canvas.height - 120;
            if (isOverDeck) {
                saveUnitToDeck(heldUnit);
            }
            heldUnit = null;
        }
    }
}

function saveUnitToDeck(unit) {
    state.units = state.units.filter(u => u !== unit);

    const newCard = {
        category: 'unit',
        type: unit.type,
        savedMutations: unit.appliedMutations ? [...unit.appliedMutations] : []
    };

    state.playerHand.push(newCard);
    renderHands();
    updateUI();
}