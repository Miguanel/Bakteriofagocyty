import { UNIT_TYPES, MUTATION_TYPES } from './constants.js';

export const state = {
    gameMode: 'pvp', p1Name: 'Niebieski', p2Name: 'Czerwony', activePlayerId: 'player',
    phase: 'START_SCREEN', turnTimer: 0,
    playerATP: 25, enemyATP: 25,
    playerHP: 100, enemyHP: 100,
    playerIncome: 0, enemyIncome: 0,
    pipettes: { player: 3, enemy: 3 },
    labUnits: { player: [], enemy: [] },
    battleUnits: [],
    decks: { player: [], enemy: [] },
    hands: { player: [], enemy: [] },
    discards: { player: [], enemy: [] },

    // --- NOWOŚĆ: Śledzenie obiektu najechanego w bocznym menu ---
    hoveredUnitFromUI: null,

    selectedUnit: null, dragPreview: null, nextSpawnAngle: 0,
    energyDrops: []
};

// ... (reszta pliku pozostaje bez zmian)
export function randomizePlayerAngle() {
    state.nextSpawnAngle = state.activePlayerId === 'player' ? (Math.PI + (Math.random() - 0.5)) : ((Math.random() - 0.5));
}

function generateProceduralCombo() {
    const allMutations = Object.keys(MUTATION_TYPES);
    const numMutations = Math.floor(Math.random() * 2) + 1;
    const combo = [];
    for(let i=0; i<numMutations; i++) {
        combo.push(allMutations[Math.floor(Math.random() * allMutations.length)]);
    }
    return combo;
}

export function initializeDecks() {
    ['player', 'enemy'].forEach(owner => {
        state.hands[owner] = [];
        state.decks[owner] = [];
        state.discards[owner] = [];
        state.pipettes[owner] = 3;

        const baseUnits = ['virus', 'bacteria', 'tardigrade', 'macrophage', 'spore', 'paramecium', 'amoeba', 'bacteriophage', 'erythrocyte', 'flower', 'flower'];

        baseUnits.forEach(type => {
            state.hands[owner].push({ category: 'unit', type: type, savedMutations: [] });
        });

        Object.keys(MUTATION_TYPES).forEach(m => {
            state.decks[owner].push({ category: 'mutation', type: m });
            state.decks[owner].push({ category: 'mutation', type: m });
        });

        for(let i=0; i<10; i++) {
            state.decks[owner].push({
                category: 'mutation',
                type: Object.keys(MUTATION_TYPES)[Math.floor(Math.random() * Object.keys(MUTATION_TYPES).length)],
                isCombo: true,
                extraMutations: generateProceduralCombo()
            });
        }
        state.decks[owner].sort(() => Math.random() - 0.5);
    });
}

export function drawMutations(who, amount = 1) {
    for(let i=0; i<amount; i++){
        if (state.decks[who].length > 0) {
            state.hands[who].push(state.decks[who].pop());
        }
    }
}

export const drawCard = drawMutations;