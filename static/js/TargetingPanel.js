import { state } from './GameState.js';
import { UNIT_TYPES, MUTATION_TYPES } from './constants.js';
import { showDamageNumber, renderHands, updateUI, showBioModal } from './UI.js';
import { Unit } from './Unit.js';

export function renderTargetingPanel() {
    const panel = document.getElementById('targeting-roster-list');
    if (!panel) return;

    panel.innerHTML = '';

    // Wyszukujemy jednostki będące aktualnie na arenie (oprócz baz)
    const activeUnits = state.battleUnits.filter(u => u.hp > 0 && u.type !== 'core_base');

    if (activeUnits.length === 0) {
        panel.innerHTML = '<div style="color:#7f8c8d; font-style:italic; padding: 10px;">Brak organizmów na arenie...</div>';
        return;
    }

    activeUnits.forEach(unit => {
        const isMine = unit.owner === state.activePlayerId;
        const typeInfo = UNIT_TYPES[unit.type];

        const el = document.createElement('div');
        el.className = `target-card ${isMine ? 'target-mine' : 'target-enemy'}`;

        // Rysowanie mikroskopijnych miniaturek genów podpiętych pod komórkę
        const mutHtml = unit.appliedMutations.map(m => {
            const mInfo = MUTATION_TYPES[m];
            return `<span class="target-mut-icon" title="${mInfo.label}">${mInfo.icon}</span>`;
        }).join('');

        el.innerHTML = `
            <div class="target-icon" style="color: ${typeInfo.color}">${typeInfo.icon}</div>
            <div class="target-hp">❤️ ${Math.ceil(unit.hp)}</div>
            <div class="target-muts">${mutHtml}</div>
        `;

        // Zdarzenia najechania myszką (podświetla na canvasie fizyczną jednostkę)
        el.addEventListener('mouseenter', () => state.hoveredUnitFromUI = unit);
        el.addEventListener('mouseleave', () => state.hoveredUnitFromUI = null);

        // Kliknięcie pokazuje pełny ekran statystyk (Twój piękny Bio Modal z poprzedniego kroku)
        el.addEventListener('click', () => {
            if(!state.dragPreview) showBioModal({ category: 'unit', type: unit.type, unitObj: unit });
        });

        // --- LOGIKA PRZECIĄGANIA I UPUSZCZANIA MUTACJI (BEZPOŚREDNIO NA WIZYTÓWKĘ) ---
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (state.dragPreview && state.dragPreview.category === 'mutation') {
                el.classList.add('drag-over');
                state.dragPreview.targetUnit = unit;
                state.dragPreview.validTarget = true;
            }
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over');
            if (state.dragPreview) {
                state.dragPreview.targetUnit = null;
                state.dragPreview.validTarget = false;
            }
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');

            if (state.dragPreview && state.dragPreview.category === 'mutation' && state.dragPreview.validTarget) {
                const mutType = state.dragPreview.type;
                const cost = state.dragPreview.cost;
                const handIndex = state.dragPreview.index;

                // Odjęcie kosztu ATP
                if (state.activePlayerId === 'player') state.playerATP -= cost;
                else state.enemyATP -= cost;

                // Implementacja efektów
                if (mutType === 'EXTRA_PIPETTE') {
                    if(!state.pipettes) state.pipettes = { player: 3, enemy: 3 };
                    state.pipettes[state.activePlayerId] = Math.min(9, state.pipettes[state.activePlayerId] + 3);
                    showDamageNumber(`+3 🧪 PIPETA`, unit.x, unit.y, '#00cec9');
                } else if (mutType === 'MITOSIS') {
                    const clone = new Unit(unit.x + unit.radius + 10, unit.y, unit.type, state.activePlayerId, state.nextSpawnAngle);
                    if (unit.appliedMutations) { unit.appliedMutations.forEach(mCode => clone.applyGeneticCard(mCode)); }
                    state.battleUnits.push(clone);
                    showDamageNumber(`➗ KLON!`, unit.x, unit.y - 20, '#9b59b6');
                } else {
                    unit.applyGeneticCard(mutType);
                    showDamageNumber(`${mutType}`, unit.x, unit.y, '#00ff00');
                }

                // Usunięcie karty z ręki
                state.hands[state.activePlayerId].splice(handIndex, 1);
                state.dragPreview = null;

                // Odświeżenie UI (w tym naszego Panelu Celowania, by zaaktualizować HP i ikonki)
                renderHands();
                updateUI();
                renderTargetingPanel();
            }
        });

        panel.appendChild(el);
    });
}