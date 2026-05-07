import { state } from './GameState.js';
import { UNIT_TYPES, MUTATION_TYPES } from './constants.js';
import { Unit } from './Unit.js';
import { gameContainer, canvas } from './Canvas.js';

const deckPreviewContainer = document.getElementById('deck-preview-container') || createDeckPreview();
function createDeckPreview() {
    const el = document.createElement('div');
    el.id = 'deck-preview-container';
    el.innerHTML = `<div class="deck-title" id="deck-count">TALIA: 0</div><div class="deck-list" id="deck-list"></div>`;
    document.body.appendChild(el);
    return el;
}
const deckCountLabel = document.getElementById('deck-count');
const deckList = document.getElementById('deck-list');
const deckContainer = document.getElementById('deck-container');

const tutorialPanel = document.getElementById('tutorial-panel') || (function() {
    const tp = document.createElement('div');
    tp.id = 'tutorial-panel';
    gameContainer.appendChild(tp);
    return tp;
})();

deckContainer.addEventListener('wheel', (e) => {
    if (deckContainer.scrollWidth > deckContainer.clientWidth) {
        if (e.deltaY !== 0) {
            e.preventDefault();
            deckContainer.scrollLeft += e.deltaY;
        }
    }
});

const enemyHandContainer = document.getElementById('enemy-hand-container');
const atpValueLabel = document.getElementById('atp-value');
const enemyAtpLabel = document.getElementById('enemy-atp-val');
const playerHpText = document.getElementById('player-hp-text');
const enemyHpText = document.getElementById('enemy-hp-text');
const playerHpFill = document.getElementById('player-hp-fill');
const enemyHpFill = document.getElementById('enemy-hp-fill');

export function renderHands() {
    deckContainer.innerHTML = '';
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

    const renderSection = (title, icon, cards, glowClass) => {
        if (cards.length === 0) return;
        const header = document.createElement('div');
        header.className = `deck-section-header ${glowClass}`;
        header.innerHTML = `<span>${icon}</span>${title}`;
        deckContainer.appendChild(header);

        cards.forEach(cardData => {
            const cardEl = createCardElement(cardData, cardData.originalIndex);
            deckContainer.appendChild(cardEl);
        });
    };

    renderSection('JEDNOSTKI', '🧫', units, 'section-units');
    renderSection('MUTACJE', '🧬', mutations, 'section-mutations');

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

    renderDeckPreview();
    initDragAndDrop();
    updateCardAvailability();
}

export function renderDeckPreview() {
    const activeDeck = state.decks[state.activePlayerId] || [];
    deckCountLabel.innerText = `TALIA: ${activeDeck.length}`;
    deckList.innerHTML = '';
    activeDeck.forEach(cardData => {
        const el = document.createElement('div');
        el.className = 'mini-deck-card';
        let icon = '?';
        if (cardData.category === 'unit') {
            icon = UNIT_TYPES[cardData.type].icon;
            if (cardData.savedMutations && cardData.savedMutations.length > 0) {
                el.classList.add('mini-upgraded');
                el.innerHTML = `<span class="mini-buff-icon">⚡</span>`;
            }
        } else {
            icon = '🧬';
            el.style.borderColor = '#27ae60';
        }
        if (!el.innerHTML) el.innerText = icon;
        else el.innerHTML = icon + el.innerHTML;
        deckList.appendChild(el);
    });
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

        let mutationIconsHtml = '';
        if (cardData.savedMutations && cardData.savedMutations.length > 0) {
            const counts = {};
            cardData.savedMutations.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
            mutationIconsHtml = '<div class="card-buffs-row">';
            Object.keys(counts).forEach(key => {
                if (MUTATION_TYPES[key]) {
                    const count = counts[key];
                    const icon = MUTATION_TYPES[key].icon;
                    const countHtml = count > 1 ? `<span class="buff-count">x${count}</span>` : '';
                    mutationIconsHtml += `<div class="buff-badge">${icon}${countHtml}</div>`;
                }
            });
            mutationIconsHtml += '</div>';
        }

        let incomeHtml = '';
        if (totalIncome > 0) {
            incomeHtml = `<div class="income-badge" style="background:#f1c40f; color:#2c3e50; font-weight:bold;" title="Dochód ATP">+${totalIncome}⚡</div>`;
        }

        el.innerHTML = `
            ${incomeHtml}
            <div class="cost-badge">${info.cost}</div>
            <div class="card-main-icon">${info.icon}</div>
            ${mutationIconsHtml}
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

        el.innerHTML = `
            <div class="cost-badge" style="background:${color}">${info.cost}</div>
            <div class="card-main-icon">🧬</div>
            <div class="card-title">${info.label}</div>
            <div class="card-desc">${info.description}</div>
            <div class="stats-row">CEL: JEDNOSTKA</div>`;
        el.classList.add('mutation-card');
    }

    el.dataset.category = cardData.category;
    el.dataset.type = cardData.type;
    return el;
}

export function populateDetailsPanel() {
    const listEl = document.getElementById('details-list');
    const totalAtpEl = document.getElementById('details-total-atp');
    if (!listEl || !totalAtpEl) return;

    listEl.innerHTML = '';
    const currentLabUnits = state.labUnits[state.activePlayerId] || [];
    let totalAtp = 0;

    if (currentLabUnits.length === 0) {
        listEl.innerHTML = '<p style="color:#7f8c8d; padding: 20px; font-style:italic; text-align:center;">Brak organizmów na szalce.</p>';
    }

    currentLabUnits.forEach((u, idx) => {
        const typeInfo = UNIT_TYPES[u.type];
        const unitIncome = (typeInfo?.income || 0) + (u.traits.photosynthesis || 0);
        totalAtp += unitIncome;

        const mutNames = u.appliedMutations.length > 0
            ? u.appliedMutations.map(m => MUTATION_TYPES[m] ? MUTATION_TYPES[m].label : m).join(', ')
            : 'Brak genów';

        const item = document.createElement('div');
        item.className = 'detail-item';

        item.innerHTML = `
            <div class="detail-icon">${typeInfo.icon}</div>
            <div class="detail-info">
                <div class="detail-name" style="color: ${typeInfo.color}">${u.type}</div>
                <div class="detail-mutations">🧬 ${mutNames}</div>
                <div class="detail-stats">
                    <span style="color:#ff7675">⚔️ ${u.atk}</span>
                    <span style="color:#55efc4">❤️ ${Math.ceil(u.hp)}/${Math.ceil(u.maxHp)}</span>
                </div>
            </div>
            <div class="detail-atp">+${unitIncome} ⚡</div>
        `;

        // DRAG & DROP NA PRAWY PANEL!
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (state.dragPreview && state.dragPreview.category === 'mutation') {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');

            if (state.dragPreview && state.dragPreview.category === 'mutation') {
                const mutType = state.dragPreview.type;
                const handIndex = state.dragPreview.index;

                u.applyGeneticCard(mutType); // Aplikacja na ten konkretny organizm
                showDamageNumber(`${mutType}`, u.x, u.y, '#00ff00');

                state.hands[state.activePlayerId].splice(handIndex, 1);
                state.dragPreview = null;

                renderHands();
                updateUI();
            }
        });

        listEl.appendChild(item);
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
        deckPreviewContainer.style.display = 'none';
    } else {
        const battleIncome = state.battleUnits.reduce((sum, u) => {
            if (u.owner === state.activePlayerId && !u.isDormant) return sum + (UNIT_TYPES[u.type].income || 0) + (u.traits.photosynthesis || 0);
            return sum;
        }, 0);

        const baseIncome = state.activePlayerId === 'player' ? state.playerIncome : state.enemyIncome;
        const totalIncome = 5 + (baseIncome || 0) + battleIncome;

        atpValueLabel.innerHTML = `${currentATP} <span style="font-size:14px; color:#2ecc71; font-weight:bold;">(+${totalIncome})</span>`;
        deckPreviewContainer.style.display = 'flex';
        renderDeckPreview();
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
    populateDetailsPanel(); // Oświeżamy prawy panel z listą
}

function updateTutorialText() {
    let title = ""; let content = ""; let borderColor = "#3498db";

    if (state.phase.startsWith('LAB_')) {
        title = `🔬 Laboratorium (${state.activePlayerId === 'player' ? state.p1Name : state.p2Name})`;
        borderColor = "#00ffea";
        content = `<ul><li><b>Przeciągaj geny</b> na mikrob w szalce lub na liście po prawej!</li></ul>`;
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
            state.dragPreview = { category, type, cost, index, savedMutations, x: 0, y: 0, validTarget: false };
            const emptyImg = new Image();
            emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(emptyImg, 0, 0);
        });
        card.addEventListener('dragend', () => { card.classList.remove('dragging'); state.dragPreview = null; });
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
            if (type === 'MITOSIS') {
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