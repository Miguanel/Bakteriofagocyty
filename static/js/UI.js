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

    const indexedHand = state.playerHand.map((card, index) => ({ ...card, originalIndex: index }));

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

    enemyHandContainer.innerHTML = '';
    state.enemyHand.forEach(cardData => {
        const miniCard = document.createElement('div');
        miniCard.className = 'mini-card';
        let icon = (cardData.category === 'unit') ? UNIT_TYPES[cardData.type].icon : '🧬';
        miniCard.innerText = icon;
        enemyHandContainer.appendChild(miniCard);
    });

    renderDeckPreview();
    initDragAndDrop();
    updateCardAvailability();
}

export function renderDeckPreview() {
    deckCountLabel.innerText = `TALIA: ${state.playerDeck.length}`;
    deckList.innerHTML = '';
    state.playerDeck.forEach(cardData => {
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
                if (mutCode === 'TANK_DNA') currentHp = currentHp * 1.5;
                else if (mutCode === 'TOXIN_PLASMID') {
                    currentAtk += 5;
                    currentHp = currentHp * 0.7;
                }
                else if (mutCode === 'APOPTOSIS') currentAtk += 15;
                else if (mutCode === 'LIPIDS') currentHp += 20;
                else if (mutCode === 'CHLOROPLASTS') totalIncome += 3;
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
        // NOWOŚĆ: Zawsze pokazujemy dochód, jeśli istnieje (niezależnie od trybu)
        if (totalIncome > 0) {
            incomeHtml = `<div class="income-badge" style="background:#f1c40f; color:#2c3e50; font-weight:bold;" title="Dochód ATP co turę">+${totalIncome} ⚡</div>`;
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

export function updateUI() {
    if (state.phase === 'LAB_MODE') {
        const currentLabIncome = state.units.reduce((sum, u) => {
            const typeInfo = UNIT_TYPES[u.type];
            return sum + (typeInfo && typeInfo.income ? typeInfo.income : 0) + (u.traits.photosynthesis || 0);
        }, 0);
        atpValueLabel.innerHTML = `${state.playerATP} <span style="font-size:12px; color:#2ecc71; margin-left:5px;">(+${currentLabIncome} z szalki)</span>`;
    }
    else {
        // NOWOŚĆ: Dynamicznie liczymy dochód jednostek, które są teraz na arenie bitwy!
        const battleIncome = state.units.reduce((sum, u) => {
            if (u.owner === 'player' && !u.isDormant) {
                return sum + (UNIT_TYPES[u.type].income || 0) + (u.traits.photosynthesis || 0);
            }
            return sum;
        }, 0);

        const totalIncome = 5 + (state.playerIncome || 0) + battleIncome;
        atpValueLabel.innerHTML = `${state.playerATP} <span style="font-size:14px; color:#2ecc71; font-weight:bold;">(+${totalIncome})</span>`;
    }

    enemyAtpLabel.innerText = state.enemyATP;
    playerHpText.innerText = Math.max(0, Math.ceil(state.playerHP)) + " HP";
    enemyHpText.innerText = Math.max(0, Math.ceil(state.enemyHP)) + " HP";
    const playerPct = Math.max(0, (state.playerHP / 100) * 100);
    const enemyPct = Math.max(0, (state.enemyHP / 100) * 100);
    playerHpFill.style.width = playerPct + "%";
    enemyHpFill.style.width = enemyPct + "%";

    updateCardAvailability();

    if (state.phase === 'LAB_MODE') {
        deckPreviewContainer.style.display = 'none';
    } else {
        deckPreviewContainer.style.display = 'flex';
        renderDeckPreview();
    }
}

function updateCardAvailability() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (state.phase === 'LAB_MODE') {
            card.classList.remove('disabled'); return;
        }
        const index = card.dataset.handIndex;
        if (!state.playerHand[index]) return;
        const cardData = state.playerHand[index];
        let cost = 0;
        if (cardData.category === 'unit') cost = UNIT_TYPES[cardData.type].cost;
        else if (cardData.category === 'mutation') cost = MUTATION_TYPES[cardData.type].cost;

        if (cost > state.playerATP) card.classList.add('disabled');
        else card.classList.remove('disabled');
    });
}

export function showDamageNumber(value, x, y, color) {
    const el = document.createElement('div');
    el.className = 'damage-float';
    el.innerText = typeof value === 'number' ? "-" + value : value;
    if (x === null || x === undefined) {
        el.style.left = '80px';
        el.style.top = '50px';
    } else {
        el.style.left = (x + gameContainer.offsetLeft) + 'px';
        el.style.top = (y + gameContainer.offsetTop) + 'px';
    }
    el.style.color = color;
    el.style.fontWeight = 'bold';
    el.style.fontSize = '24px';
    el.style.textShadow = '0 1px 3px black';
    el.style.zIndex = 1000;

    gameContainer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

export function initDragAndDrop() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            if (state.phase !== 'LAB_MODE' && state.phase !== 'PLAYER_PLANNING') { e.preventDefault(); return; }
            const index = card.dataset.handIndex;
            const cardData = state.playerHand[index];
            if (!cardData) { e.preventDefault(); return; }
            const category = cardData.category;
            const type = cardData.type;
            const savedMutations = cardData.savedMutations || [];
            let cost = 0;
            if (category === 'unit') cost = UNIT_TYPES[type].cost;
            else if (category === 'mutation') cost = MUTATION_TYPES[type].cost;
            if (state.phase === 'LAB_MODE') cost = 0;
            else if (state.playerATP < cost) { e.preventDefault(); return; }
            if (card.classList.contains('disabled') && state.phase !== 'LAB_MODE') { e.preventDefault(); return; }
            card.classList.add('dragging');
            state.dragPreview = { category, type, cost, index, savedMutations, x: 0, y: 0, validTarget: false };
            const emptyImg = new Image();
            emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(emptyImg, 0, 0);
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            state.dragPreview = null;
        });
    });
}

function findUnitAt(mx, my) {
    for (let i = state.units.length - 1; i >= 0; i--) {
        const u = state.units[i];
        if (Math.sqrt((u.x-mx)**2 + (u.y-my)**2) <= u.radius + 10) return u;
    }
    return null;
}

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!state.dragPreview) return;
    const rect = canvas.getBoundingClientRect();
    state.dragPreview.x = e.clientX - rect.left;
    state.dragPreview.y = e.clientY - rect.top;
    if (state.dragPreview.category === 'mutation') {
        const target = findUnitAt(state.dragPreview.x, state.dragPreview.y);
        if (target && target.owner === 'player') {
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

    if (category === 'unit') {
        if (UNIT_TYPES[type]) {
            const newUnit = new Unit(x, y, type, 'player', state.nextSpawnAngle);
            if (savedMutations && savedMutations.length > 0) {
                savedMutations.forEach(mCode => newUnit.applyGeneticCard(mCode));
            }
            state.units.push(newUnit);
            state.playerATP -= cost;
            success = true;
        }
    } else if (category === 'mutation') {
        if (targetUnit) {
            if (type === 'MITOSIS') {
                const clone = new Unit(targetUnit.x + targetUnit.radius + 10, targetUnit.y, targetUnit.type, 'player', state.nextSpawnAngle);
                if (targetUnit.appliedMutations) {
                    targetUnit.appliedMutations.forEach(mCode => clone.applyGeneticCard(mCode));
                }
                state.units.push(clone);
                state.playerATP -= cost;
                showDamageNumber(`➗ KLON!`, targetUnit.x, targetUnit.y - 20, '#9b59b6');
                success = true;
            }
            else {
                targetUnit.applyGeneticCard(type);
                state.playerATP -= cost;
                showDamageNumber(`${type}`, targetUnit.x, targetUnit.y, '#00ff00');
                success = true;
            }
        }
    }

    if (success) {
        const playedCard = state.playerHand.splice(index, 1)[0];

        if (state.phase !== 'LAB_MODE') {
            if (!state.playerDiscard) state.playerDiscard = [];
            state.playerDiscard.push(playedCard);
        }

        renderHands();
        updateUI();
    }
    state.dragPreview = null;
});