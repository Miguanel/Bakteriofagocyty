import { state } from './GameState.js';
import { UNIT_TYPES, MUTATION_TYPES } from './constants.js';
import { Unit } from './Unit.js';
import { gameContainer, canvas } from './Canvas.js';

const enemyHandContainer = document.getElementById('enemy-hand-container');
const atpValueLabel = document.getElementById('atp-value');
const enemyAtpLabel = document.getElementById('enemy-atp-val');
const playerHpText = document.getElementById('player-hp-text');
const enemyHpText = document.getElementById('enemy-hp-text');
const playerHpFill = document.getElementById('player-hp-fill');
const enemyHpFill = document.getElementById('enemy-hp-fill');

// Śledzimy scrollowanie obu pasków
const unitsTrack = document.getElementById('units-track');
const mutationsTrack = document.getElementById('mutations-track');

if(unitsTrack) {
    unitsTrack.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) { e.preventDefault(); unitsTrack.scrollLeft += e.deltaY; }
    });
}
if(mutationsTrack) {
    mutationsTrack.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) { e.preventDefault(); mutationsTrack.scrollLeft += e.deltaY; }
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.clickable-mutation')) {
        document.querySelectorAll('.mutation-popover').forEach(p => p.style.display = 'none');
    }
});

export function renderHands() {
    if(!unitsTrack || !mutationsTrack) return;

    unitsTrack.innerHTML = '';
    mutationsTrack.innerHTML = '';

    const activeHand = state.hands[state.activePlayerId] || [];
    const indexedHand = activeHand.map((card, index) => ({ ...card, originalIndex: index }));

    const units = indexedHand.filter(c => c.category === 'unit');
    const mutations = indexedHand.filter(c => c.category === 'mutation');

    const sortLogic = (a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        const costA = a.category === 'unit' ? UNIT_TYPES[a.type].cost : MUTATION_TYPES[a.type].cost;
        const costB = b.category === 'unit' ? UNIT_TYPES[b.type].cost : MUTATION_TYPES[b.type].cost;
        return costA - costB;
    };

    units.sort(sortLogic);
    mutations.sort(sortLogic);

    // --- NOWOŚĆ: Dwa paski kart ---
    units.forEach(cardData => {
        const cardEl = createCardElement(cardData, cardData.originalIndex);
        cardEl.addEventListener('click', () => { if(!state.dragPreview) showBioModal(cardData); });
        unitsTrack.appendChild(cardEl);
    });

    mutations.forEach(cardData => {
        const cardEl = createCardElement(cardData, cardData.originalIndex);
        cardEl.addEventListener('click', () => { if(!state.dragPreview) showBioModal(cardData); });
        mutationsTrack.appendChild(cardEl);
    });

    if (enemyHandContainer) {
        enemyHandContainer.innerHTML = '';
        if (state.gameMode === 'pve' && state.activePlayerId === 'player') {
            const opHand = state.hands['enemy'] || [];
            opHand.forEach(() => {
                const miniCard = document.createElement('div');
                miniCard.className = 'mini-card';
                miniCard.innerText = '🧬';
                enemyHandContainer.appendChild(miniCard);
            });
        }
    }

    initDragAndDrop();
    updateCardAvailability();
}

function createCardElement(cardData, index) {
    const el = document.createElement('div');
    el.className = 'card';
    el.draggable = true;
    el.dataset.handIndex = index;

    let info = {};
    if (cardData.category === 'unit') {
        info = UNIT_TYPES[cardData.type];
        let currentHp = info.hp;
        let currentAtk = info.atk;
        let totalIncome = info.income || 0;

        if (cardData.savedMutations && cardData.savedMutations.length > 0) {
            cardData.savedMutations.forEach(mutCode => {
                if (mutCode === 'TANK_DNA') currentHp *= 1.5;
                else if (mutCode === 'TOXIN_PLASMID') { currentAtk += 5; currentHp *= 0.7; }
                else if (mutCode === 'APOPTOSIS') currentAtk += 15;
                else if (mutCode === 'LIPIDS') currentHp += 20;
                else if (mutCode === 'CHLOROPLASTS') totalIncome += 3;
                else if (mutCode === 'SYMBIOSIS') { currentHp += 15; totalIncome += 2; }
                else if (mutCode === 'PREDATOR_DNA') { currentAtk += 10; }
                else if (mutCode === 'SPIKED_ARMOR') { currentHp += 20; }
                else if (mutCode === 'MUTANT_BLOOD') { currentAtk += 5; }
            });
            el.classList.add('upgraded-card');
        }
        currentHp = Math.max(1, Math.ceil(currentHp));
        currentAtk = Math.ceil(currentAtk);

        let incomeHtml = '';
        if (totalIncome > 0) {
            incomeHtml = `<div class="income-badge" title="Dochód ATP">+${totalIncome}⚡</div>`;
        }

        let upgHtml = '';
        if(cardData.savedMutations && cardData.savedMutations.length > 0) {
            upgHtml = `<div style="position:absolute; top:-5px; left:30px; font-size:16px;">✨</div>`;
        }

        el.innerHTML = `
            ${incomeHtml}
            ${upgHtml}
            <div class="cost-badge">${info.cost}</div>
            <div class="card-main-icon">${info.icon}</div>
            <div class="card-title">${cardData.type}</div>
            <div class="card-desc">${info.description}</div>
            <div class="stats-row">
                <div class="card-stat atk-stat">⚔️${currentAtk}</div>
                <div class="card-stat hp-stat">❤️${currentHp}</div>
            </div>`;
    } else {
        info = MUTATION_TYPES[cardData.type];
        let color = '#27ae60';
        if (cardData.type === 'TANK_DNA') color = '#8e44ad';
        else if (cardData.type === 'TOXIN_PLASMID' || cardData.type === 'APOPTOSIS') color = '#c0392b';
        else if (cardData.type === 'MITOSIS' || cardData.type === 'CORDYCEPS') color = '#9b59b6';
        else if (cardData.type === 'CELL_WALL') color = '#e67e22';
        else if (cardData.type === 'FLAGELLA') color = '#3498db';
        else if (cardData.type === 'LIPIDS') color = '#f1c40f';
        else if (cardData.type === 'SYMBIOSIS') color = '#1abc9c';
        else if (cardData.type === 'PREDATOR_DNA') color = '#d35400';
        else if (cardData.type === 'SPIKED_ARMOR') color = '#7f8c8d';
        else if (cardData.type === 'MUTANT_BLOOD') color = '#e84393';
        else if (cardData.type === 'EXTRA_PIPETTE') color = '#00cec9';

        el.innerHTML = `
            <div class="cost-badge" style="background:${color}">${info.cost}</div>
            <div class="card-main-icon">🧬</div>
            <div class="card-title">${info.label}</div>
            <div class="card-desc">${info.description}</div>
            <div class="stats-row" style="justify-content:center;">DNA</div>`;
        el.classList.add('mutation-card');
    }

    el.dataset.category = cardData.category;
    el.dataset.type = cardData.type;
    return el;
}

export function populateDetailsPanel() {
    const listEl = document.getElementById('details-list');
    const totalAtpEl = document.getElementById('details-total-atp');
    const pipetteCountEl = document.getElementById('ui-pipette-count');

    if (!listEl || !totalAtpEl) return;

    listEl.innerHTML = '';
    const currentLabUnits = state.labUnits[state.activePlayerId] || [];
    let totalAtp = 0;
    const pipettesCount = state.pipettes[state.activePlayerId];

    if(pipetteCountEl) {
        pipetteCountEl.innerText = `🧪 PIPETY: ${pipettesCount}/9`;
        pipetteCountEl.style.color = pipettesCount > 0 ? "#00cec9" : "#7f8c8d";
    }

    if (currentLabUnits.length === 0) {
        listEl.innerHTML = '<p style="color:#7f8c8d; padding: 20px; font-style:italic; text-align:center;">Brak organizmów na szalce.</p>';
    }

    currentLabUnits.forEach((u, idx) => {
        const typeInfo = UNIT_TYPES[u.type];
        const unitIncome = (typeInfo?.income || 0) + (u.traits.photosynthesis || 0);
        totalAtp += unitIncome;

        // --- ZMIANA: Zgrabne "Kapsułki" mutacji zamiast zepsutych kart ---
        const mutCardsHtml = u.appliedMutations.map((mCode, mIdx) => {
            const mutInfo = MUTATION_TYPES[mCode] || { label: mCode, icon: '🧬', cost: 0, description: 'Brak danych' };

            let statText = "";
            if(mCode === 'TANK_DNA') statText = '<span style="color:#55efc4">+50% ❤️</span>';
            else if(mCode === 'CHLOROPLASTS') statText = '<span style="color:#f1c40f">+3 ⚡</span>';
            else if(mCode === 'TOXIN_PLASMID') statText = '<span style="color:#ff7675">+5 ⚔️</span>';
            else if(mCode === 'APOPTOSIS') statText = '<span style="color:#ff7675">+15 ⚔️</span>';
            else if(mCode === 'LIPIDS') statText = '<span style="color:#55efc4">+20 ❤️</span>';
            else if(mCode === 'SYMBIOSIS') statText = '<span style="color:#f1c40f">+2 ⚡</span>';
            else if(mCode === 'PREDATOR_DNA') statText = '<span style="color:#ff7675">+10 ⚔️</span>';
            else if(mCode === 'SPIKED_ARMOR') statText = '<span style="color:#55efc4">+20 ❤️</span>';
            else if(mCode === 'MUTANT_BLOOD') statText = '<span style="color:#ff7675">+5 ⚔️</span>';
            else statText = '<span style="color:#bdc3c7">Aktywne</span>';

            const pipDisabledClass = pipettesCount <= 0 ? "disabled-pipette" : "";

            return `
                <div class="mutation-pill clickable-mutation" data-mutation="${mCode}">
                    <div class="pill-icon">${mutInfo.icon}</div>
                    <div class="pill-text">${statText}</div>
                    <button class="extract-mut-btn ${pipDisabledClass}" data-midx="${mIdx}" title="Wyciągnij gen">🧪</button>
                </div>
            `;
        }).join('');

        const item = document.createElement('div');
        item.className = 'detail-item';

        if (state.dragPreview && state.dragPreview.targetUnit === u) {
            item.classList.add('drag-over');
        }

        // --- ZMIANA: Czysty układ przycisków za pomocą Grid ---
        item.innerHTML = `
            <div class="detail-main">
                <div class="detail-icon">${typeInfo.icon}</div>
                <div class="detail-info">
                    <div class="detail-name" style="color: ${typeInfo.color}">${u.type}</div>
                    <div class="detail-stats">
                        <span style="color:#ff7675">⚔️ ${Math.ceil(u.atk)}</span>
                        <span style="color:#55efc4">❤️ ${Math.ceil(u.hp)}/${Math.ceil(u.maxHp)}</span>
                    </div>
                    ${u.appliedMutations.length > 0 ? `<div class="attached-mutations-container">${mutCardsHtml}</div>` : ''}
                </div>
                <div class="detail-atp">+${unitIncome} ⚡</div>
            </div>
            <div class="unit-actions-grid">
                <button class="unit-action-btn extract-btn">📥 POBIERZ DO TALII</button>
                <button class="unit-action-btn stats-btn">📊 STATYSTYKI</button>
                <button class="unit-action-btn discard-btn">❌ ZNISZCZ (ZRÓB MIEJSCE)</button>
            </div>
        `;

        item.addEventListener('mouseenter', () => state.hoveredUnitFromUI = u);
        item.addEventListener('mouseleave', () => state.hoveredUnitFromUI = null);

        item.addEventListener('click', (e) => {
            if (e.target.closest('.unit-action-btn') || e.target.closest('.clickable-mutation')) return;
            document.querySelectorAll('.detail-item.expanded').forEach(el => {
                if(el !== item) el.classList.remove('expanded');
            });
            item.classList.toggle('expanded');
        });

        item.querySelector('.extract-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            state.labUnits[state.activePlayerId] = state.labUnits[state.activePlayerId].filter(x => x !== u);
            const newCard = { category: 'unit', type: u.type, savedMutations: u.appliedMutations ? [...u.appliedMutations] : [] };
            state.hands[state.activePlayerId].push(newCard);
            state.hoveredUnitFromUI = null;
            renderHands(); updateUI();
        });

        item.querySelector('.stats-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showBioModal({ category: 'unit', type: u.type, unitObj: u });
        });

        item.querySelector('.discard-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            state.labUnits[state.activePlayerId] = state.labUnits[state.activePlayerId].filter(x => x !== u);
            updateUI();
        });

        item.querySelectorAll('.extract-mut-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (state.pipettes[state.activePlayerId] > 0) {
                    const mIdx = parseInt(btn.dataset.midx);
                    const extractedMut = u.appliedMutations.splice(mIdx, 1)[0];
                    state.pipettes[state.activePlayerId]--;
                    u.recalculateStats();
                    state.hands[state.activePlayerId].push({ category: 'mutation', type: extractedMut });
                    showDamageNumber(`🧪 ODKLEJONO!`, u.x, u.y, "#00cec9");
                    renderHands(); updateUI();
                }
            });
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (state.dragPreview && state.dragPreview.category === 'mutation') {
                item.classList.add('drag-over');
                state.dragPreview.targetUnit = u;
                state.dragPreview.validTarget = true;
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
            if (state.dragPreview) {
                state.dragPreview.targetUnit = null;
                state.dragPreview.validTarget = false;
            }
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');

            if (state.dragPreview && state.dragPreview.category === 'mutation') {
                const mutType = state.dragPreview.type;
                const handIndex = state.dragPreview.index;

                if (mutType === 'EXTRA_PIPETTE') {
                    state.pipettes[state.activePlayerId] = Math.min(9, state.pipettes[state.activePlayerId] + 3);
                    showDamageNumber(`+3 🧪 PIPETA`, u.x, u.y, '#00cec9');
                } else {
                    u.applyGeneticCard(mutType);
                    showDamageNumber(`${mutType}`, u.x, u.y, '#00ff00');
                }

                state.hands[state.activePlayerId].splice(handIndex, 1);
                state.dragPreview = null;
                renderHands(); updateUI();
            }
        });

        listEl.appendChild(item);

        item.querySelectorAll('.clickable-mutation').forEach(mc => {
            mc.addEventListener('click', (e) => {
                if(e.target.closest('.extract-mut-btn')) return;
                e.stopPropagation();
                showBioModal({ category: 'mutation', type: mc.dataset.mutation });
            });
        });
    });

    totalAtpEl.innerText = totalAtp;
}

export function updateUI() {
    const isLab = state.phase.startsWith('LAB_');
    const currentATP = state.activePlayerId === 'player' ? state.playerATP : state.enemyATP;

    if (isLab) {
        const currentLabUnits = state.labUnits[state.activePlayerId] || [];
        const currentLabIncome = currentLabUnits.reduce((sum, u) => sum + (UNIT_TYPES[u.type]?.income || 0) + (u.traits.photosynthesis || 0), 0);
        atpValueLabel.innerHTML = `${currentATP} <span style="font-size:12px; color:#2ecc71; margin-left:5px;">(+${currentLabIncome} z szalki)</span>`;
    } else {
        const battleIncome = state.battleUnits.reduce((sum, u) => {
            if (u.owner === state.activePlayerId && !u.isDormant) return sum + (UNIT_TYPES[u.type].income || 0) + (u.traits.photosynthesis || 0);
            return sum;
        }, 0);

        const baseIncome = state.activePlayerId === 'player' ? state.playerIncome : state.enemyIncome;
        const totalIncome = 5 + (baseIncome || 0) + battleIncome;

        atpValueLabel.innerHTML = `${currentATP} <span style="font-size:14px; color:#2ecc71; font-weight:bold;">(+${totalIncome})</span>`;
    }

    enemyAtpLabel.innerText = state.enemyATP;
    playerHpText.innerText = Math.max(0, Math.ceil(state.playerHP)) + " HP";
    enemyHpText.innerText = Math.max(0, Math.ceil(state.enemyHP)) + " HP";
    const playerPct = Math.max(0, (state.playerHP / 100) * 100);
    const enemyPct = Math.max(0, (state.enemyHP / 100) * 100);
    playerHpFill.style.width = playerPct + "%";
    enemyHpFill.style.width = enemyPct + "%";

    updateCardAvailability();
    updateTutorialText();
    populateDetailsPanel();
}

function updateTutorialText() {
    let title = ""; let content = ""; let borderColor = "#3498db";

    if (state.phase.startsWith('LAB_')) {
        title = `🔬 Laboratorium (${state.activePlayerId === 'player' ? state.p1Name : state.p2Name})`;
        borderColor = "#00ffea";
        content = `<ul><li><b>Kliknij organizm na liście</b>, aby rozwinąć opcje!</li></ul>`;
    } else if (state.phase.startsWith('PLANNING_')) {
        title = `⏱️ Rozstawianie (${state.activePlayerId === 'player' ? state.p1Name : state.p2Name})`;
        borderColor = state.activePlayerId === 'player' ? "#00cec9" : "#ff7675";
        content = `<ul><li>Koszt wystawienia to <b>ATP</b>.</li></ul>`;
    } else if (state.phase === 'COMBAT') {
        title = "⚔️ Walka!";
        borderColor = "#f1c40f";
        content = `<ul><li>Walka aż do upadku jednej z armii!</li></ul>`;
    }

    tutorialPanel.style.borderRightColor = borderColor;
    if(window.innerWidth <= 1050) {
        tutorialPanel.style.borderTopColor = borderColor;
        tutorialPanel.style.borderRightColor = 'transparent';
    }
    tutorialPanel.innerHTML = `<h3 style="color: ${borderColor}">${title}</h3>${content}`;
}

function updateCardAvailability() {
    const currentATP = state.activePlayerId === 'player' ? state.playerATP : state.enemyATP;
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (state.phase.startsWith('LAB_')) { card.classList.remove('disabled'); return; }

        const index = card.dataset.handIndex;
        const activeHand = state.hands[state.activePlayerId];
        if (!activeHand || !activeHand[index]) return;

        const cardData = activeHand[index];
        let cost = cardData.category === 'unit' ? UNIT_TYPES[cardData.type].cost : MUTATION_TYPES[cardData.type].cost;

        if (cost > currentATP) card.classList.add('disabled');
        else card.classList.remove('disabled');
    });
}

export function showDamageNumber(value, x, y, color) {
    const el = document.createElement('div');
    el.className = 'damage-float';
    el.innerText = typeof value === 'number' ? "-" + value : value;
    if (x === null || x === undefined) {
        el.style.left = '80px'; el.style.top = '50px';
    } else {
        el.style.left = (x + gameContainer.offsetLeft) + 'px';
        el.style.top = (y + gameContainer.offsetTop) + 'px';
    }
    el.style.color = color; el.style.fontWeight = 'bold'; el.style.fontSize = '24px';
    el.style.textShadow = '0 1px 3px black'; el.style.zIndex = 1000;
    gameContainer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

export function initDragAndDrop() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            if (state.phase === 'COMBAT' || state.phase === 'PLANNING_AI') { e.preventDefault(); return; }
            const index = card.dataset.handIndex;
            const activeHand = state.hands[state.activePlayerId];
            if (!activeHand || !activeHand[index]) { e.preventDefault(); return; }

            const cardData = activeHand[index];
            const category = cardData.category;
            const type = cardData.type;
            const savedMutations = cardData.savedMutations || [];

            let cost = category === 'unit' ? UNIT_TYPES[type].cost : MUTATION_TYPES[type].cost;
            if (state.phase.startsWith('LAB_')) cost = 0;

            const currentATP = state.activePlayerId === 'player' ? state.playerATP : state.enemyATP;
            if (currentATP < cost) { e.preventDefault(); return; }
            if (card.classList.contains('disabled') && !state.phase.startsWith('LAB_')) { e.preventDefault(); return; }

            card.classList.add('dragging');
            state.dragPreview = { category, type, cost, index, savedMutations, x: 0, y: 0, validTarget: false, targetUnit: null };
            const emptyImg = new Image();
            emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(emptyImg, 0, 0);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            state.dragPreview = null;
            updateUI();
        });
    });
}

function findUnitAt(mx, my) {
    const currentUnits = state.phase.startsWith('LAB_') ? state.labUnits[state.activePlayerId] : state.battleUnits;
    for (let i = currentUnits.length - 1; i >= 0; i--) {
        const u = currentUnits[i];
        if (Math.sqrt((u.x-mx)**2 + (u.y-my)**2) <= u.radius + 10) return u;
    }
    return null;
}

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!state.dragPreview) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    state.dragPreview.x = (e.clientX - rect.left) * scaleX;
    state.dragPreview.y = (e.clientY - rect.top) * scaleY;

    if (state.dragPreview.category === 'mutation') {
        const target = findUnitAt(state.dragPreview.x, state.dragPreview.y);

        if (target && target.owner === state.activePlayerId) {
            state.dragPreview.validTarget = true;
            state.dragPreview.targetUnit = target;
        } else {
            state.dragPreview.validTarget = false;
            state.dragPreview.targetUnit = null;
        }
    } else {
        state.dragPreview.validTarget = true;
    }
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!state.dragPreview) return;
    const { category, type, cost, x, y, validTarget, targetUnit, index, savedMutations } = state.dragPreview;
    if (!validTarget) return;

    let success = false;
    const currentUnits = state.phase.startsWith('LAB_') ? state.labUnits[state.activePlayerId] : state.battleUnits;

    if (category === 'unit') {
        if (UNIT_TYPES[type]) {
            const newUnit = new Unit(x, y, type, state.activePlayerId, state.nextSpawnAngle);
            if (savedMutations && savedMutations.length > 0) {
                savedMutations.forEach(mCode => newUnit.applyGeneticCard(mCode));
            }
            currentUnits.push(newUnit);
            if (state.activePlayerId === 'player') state.playerATP -= cost; else state.enemyATP -= cost;
            success = true;
        }
    } else if (category === 'mutation') {
        if (targetUnit) {
            if (type === 'EXTRA_PIPETTE') {
                state.pipettes[state.activePlayerId] = Math.min(9, state.pipettes[state.activePlayerId] + 3);
                showDamageNumber(`+3 🧪 PIPETA`, targetUnit.x, targetUnit.y, '#00cec9');
                if (state.activePlayerId === 'player') state.playerATP -= cost; else state.enemyATP -= cost;
                success = true;
            } else if (type === 'MITOSIS') {
                const clone = new Unit(targetUnit.x + targetUnit.radius + 10, targetUnit.y, targetUnit.type, state.activePlayerId, state.nextSpawnAngle);
                if (targetUnit.appliedMutations) { targetUnit.appliedMutations.forEach(mCode => clone.applyGeneticCard(mCode)); }
                currentUnits.push(clone);
                if (state.activePlayerId === 'player') state.playerATP -= cost; else state.enemyATP -= cost;
                showDamageNumber(`➗ KLON!`, targetUnit.x, targetUnit.y - 20, '#9b59b6');
                success = true;
            } else {
                targetUnit.applyGeneticCard(type);
                if (state.activePlayerId === 'player') state.playerATP -= cost; else state.enemyATP -= cost;
                showDamageNumber(`${type}`, targetUnit.x, targetUnit.y, '#00ff00');
                success = true;
            }
        }
    }

    if (success) {
        const playedCard = state.hands[state.activePlayerId].splice(index, 1)[0];
        if (!state.phase.startsWith('LAB_')) {
            if (!state.discards[state.activePlayerId]) state.discards[state.activePlayerId] = [];
            state.discards[state.activePlayerId].push(playedCard);
        }
        renderHands();
        updateUI();
    }
    state.dragPreview = null;
});

function showBioModal(cardData) {
    let overlay = document.getElementById('bio-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'bio-modal-overlay';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if(e.target === overlay) overlay.style.display = 'none';
        });
    }

    let title = ""; let subtitle = ""; let statsHtml = ""; let detailsHtml = ""; let color = "#2ecc71";

    if (cardData.category === 'unit') {
        const u = cardData.unitObj || { ...UNIT_TYPES[cardData.type], appliedMutations: [] };
        const base = UNIT_TYPES[cardData.type];
        title = `${cardData.type} ${base.icon}`;
        subtitle = "PROKARIOT / EUKARIOT";
        color = base.color;

        const hp = u.maxHp || base.hp;
        const atk = u.atk || base.atk;
        const speed = u.baseSpeed || base.baseSpeed;

        statsHtml = `
            <div style="display:flex; justify-content:space-around; width:100%; margin: 20px 0; font-size:20px; font-weight:bold;">
                <span style="color:#ff7675">⚔️ Atak: ${Math.ceil(atk)}</span>
                <span style="color:#55efc4">❤️ HP: ${Math.ceil(hp)}</span>
                <span style="color:#0984e3">⚡ Ruch: ${speed}</span>
            </div>
        `;
        detailsHtml = `<p style="color:#bdc3c7; font-size:16px; text-align:center;">${base.description}</p>`;

        if(u.appliedMutations && u.appliedMutations.length > 0) {
            detailsHtml += `<h4 style="color:#f1c40f; margin-top:15px;">AKTYWNE GENY:</h4><div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">`;
            u.appliedMutations.forEach(m => {
                const mData = MUTATION_TYPES[m];
                detailsHtml += `<span style="background:rgba(255,255,255,0.1); padding:8px 12px; border-radius:5px;">${mData.icon} ${mData.label}</span>`;
            });
            detailsHtml += `</div>`;
        }

    } else if (cardData.category === 'mutation') {
        const m = MUTATION_TYPES[cardData.type];
        title = `${m.label} ${m.icon}`;
        subtitle = "ŁAŃCUCH RNA / DNA";
        color = "#9b59b6";

        statsHtml = `<div style="color:#f1c40f; font-size:24px; font-weight:bold; margin: 20px 0;">KOSZT ATP: ${m.cost} ⚡</div>`;
        detailsHtml = `<p style="color:#ecf0f1; font-size:18px; text-align:center; padding:0 20px;">${m.description}</p>`;
    }

    overlay.innerHTML = `
        <div class="bio-membrane" style="background: linear-gradient(120deg, ${color}, #2c3e50, ${color});">
            <div class="bio-core">
                <h2 style="color:${color}; border-bottom-color:${color};">${title}</h2>
                <div style="font-size:12px; color:#7f8c8d; margin-top:-15px; margin-bottom:10px; text-transform:uppercase;">${subtitle}</div>
                ${statsHtml}
                ${detailsHtml}
                <button class="bio-close-btn" style="border-color:${color}; color:${color}; margin-top:30px;" onclick="document.getElementById('bio-modal-overlay').style.display='none'">ZAMKNIJ ANALIZĘ</button>
            </div>
        </div>
    `;

    overlay.style.display = 'flex';
}