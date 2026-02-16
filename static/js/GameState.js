export const state = {
    phase: 'LAB_MODE', turnTimer: 0, isRunning: true, playerATP: 20, enemyATP: 10,
    playerHP: 100, enemyHP: 100, playerIncome: 0, storedLabUnits: [], units: [],
    playerDeck: [], playerHand: [], playerDiscard: [], enemyDeck: [], enemyHand: [],
    selectedUnit: null, dragPreview: null, nextSpawnAngle: 0, isAiProcessing: false,
    isLabPaused: false, isExtractMode: false,

    // --- NOWOŚĆ: Przechowuje upuszczoną energię ---
    energyDrops: []
};

export function randomizePlayerAngle() { state.nextSpawnAngle = Math.PI + (Math.random() - 0.5); }

export function initializeDecks() {
    state.playerDeck = [];
    state.enemyDeck = [];

    ['virus', 'virus', 'virus', 'bacteria', 'bacteria', 'tardigrade', 'macrophage', 'spore', 'paramecium',
     'amoeba', 'bacteriophage', 'bacteriophage', 'erythrocyte', 'erythrocyte'].forEach(type => {
        state.playerDeck.push({ category: 'unit', type: type });
    });

    ['TANK_DNA', 'REGEN_ENZYMES', 'CELL_WALL', 'TOXIN_PLASMID', 'FLAGELLA', 'MITOSIS',
     'CHLOROPLASTS', 'CHLOROPLASTS', 'APOPTOSIS', 'CORDYCEPS', 'LIPIDS'].forEach(type => {
        state.playerDeck.push({ category: 'mutation', type: type });
    });

    state.playerDeck.sort(() => Math.random() - 0.5);

    ['virus', 'virus', 'virus', 'macrophage', 'paramecium', 'amoeba', 'bacteriophage'].forEach(type => {
        state.enemyDeck.push({ category: 'unit', type: type });
    });
}

export function drawCard(who) {
    if (who === 'player' && state.playerDeck.length > 0) state.playerHand.push(state.playerDeck.pop());
    else if (who === 'enemy' && state.enemyDeck.length > 0) state.enemyHand.push(state.enemyDeck.pop());
}