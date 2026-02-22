import { state } from './GameState.js';
import { UNIT_TYPES, MUTATION_TYPES } from './constants.js';
import { Unit } from './Unit.js';
import { canvas } from './Canvas.js';
import { updateUI, renderHands, showDamageNumber } from './UI.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function spawnEnemyTurn() {
    updateUI();
    let attempts = 0;

    // Pętla decyzyjna AI
    while (state.enemyATP >= 2 && attempts < 10 && state.enemyHand.length > 0) {
        await sleep(600); // Czas na "myślenie"

        let possibleMoves = [];

        // 1. OCENA SYTUACJI NA PLANSZY
        const drops = state.energyDrops || [];
        const playerUnits = state.units.filter(u => u.owner === 'player' && u.hp > 0);
        const enemyUnits = state.units.filter(u => u.owner === 'enemy' && u.hp > 0 && !u.isDormant);

        // Najbliższy atakujący gracz (najwyżej na osi Y)
        let highestThreat = null;
        if (playerUnits.length > 0) {
            highestThreat = playerUnits.reduce((prev, current) => (prev.y < current.y) ? prev : current);
        }

        // Najlepsza kropelka energii (najbliżej środka/góry)
        let bestDrop = null;
        if (drops.length > 0) {
            bestDrop = drops.reduce((prev, current) => (prev.y < current.y) ? prev : current);
        }

        // 2. ANALIZA KART W RĘCE
        state.enemyHand.forEach((card, index) => {
            if (card.category === 'unit' && UNIT_TYPES[card.type].cost <= state.enemyATP) {
                const uType = card.type;
                let score = 10; // Bazowa ocena
                let spawnX = 50 + Math.random() * (canvas.width - 100);
                let spawnY = 50 + Math.random() * 40; // Gdzieś na górze
                let spawnAngle = (Math.PI / 2) + (Math.random() - 0.5) * 0.5; // Domyślnie w dół

                // TAKTYKA: ZBIERACZ (Szybkie jednostki lecą po ATP)
                if (drops.length > 0 && (uType === 'virus' || uType === 'bacteriophage' || uType === 'paramecium')) {
                    score += 30; // Bardzo chcemy to zagrać!
                    spawnX = bestDrop.x; // Celujemy X w kropelkę
                    spawnAngle = Math.atan2(bestDrop.y - spawnY, bestDrop.x - spawnX); // Obliczamy kąt strzału prosto w energię
                }

                // TAKTYKA: OBROŃCA (Grube jednostki blokują gracza)
                else if (highestThreat && (uType === 'amoeba' || uType === 'tardigrade' || uType === 'erythrocyte' || uType === 'macrophage')) {
                    score += 25;
                    // Spawnuje się dokładnie na ścieżce zbliżającego się wroga
                    spawnX = highestThreat.x;
                    spawnAngle = Math.PI / 2; // Prosto w dół, na spotkanie
                }

                // TAKTYKA: FARMA (Zarodniki i powolne bakterie na tyłach)
                else if (uType === 'spore' || uType === 'bacteria') {
                    score += 20;
                    // Szukamy bezpiecznego miejsca na brzegach
                    spawnX = Math.random() > 0.5 ? 60 : canvas.width - 60;
                    spawnY = 40; // Maksymalnie z tyłu
                }

                possibleMoves.push({ type: 'SPAWN_UNIT', card, index, cost: UNIT_TYPES[card.type].cost, score, spawnX, spawnY, spawnAngle });
            }
            else if (card.category === 'mutation' && MUTATION_TYPES[card.type].cost <= state.enemyATP) {
                const targetInfo = findBestTargetForMutation(card.type, enemyUnits, playerUnits);
                if (targetInfo) {
                    possibleMoves.push({
                        type: 'APPLY_MUTATION', card, index, cost: MUTATION_TYPES[card.type].cost,
                        score: targetInfo.score, target: targetInfo.unit
                    });
                }
            }
        });

        if (possibleMoves.length === 0) break;

        // 3. WYBÓR NAJLEPSZEGO RUCHU
        // Sortujemy ruchy malejąco po "score" (ocenie punktowej)
        possibleMoves.sort((a, b) => b.score - a.score);

        // Wybieramy ruch z najwyższą punktacją
        const move = possibleMoves[0];

        // 4. WYKONANIE RUCHU
        if (move.type === 'SPAWN_UNIT') {
            state.units.push(new Unit(move.spawnX, move.spawnY, move.card.type, 'enemy', move.spawnAngle));
            console.log(`🤖 AI Taktyka: Spawnuje [${move.card.type}] (Priorytet: ${move.score})`);
        } else if (move.type === 'APPLY_MUTATION') {
            move.target.applyGeneticCard(move.card.type);
            showDamageNumber(`${move.card.type}`, move.target.x, move.target.y, '#e84118');
            console.log(`🤖 AI Taktyka: Rzuca mutację [${move.card.type}] (Priorytet: ${move.score})`);
        }

        state.enemyATP -= move.cost;
        state.enemyHand.splice(move.index, 1);

        updateUI();
        renderHands();
        attempts++;
    }

    await sleep(500);
}

// --- FUNKCJA POMOCNICZA: INTELIGENTNY WYBÓR CELU DLA MUTACJI ---
function findBestTargetForMutation(mutationType, enemyUnits, playerUnits) {
    if (enemyUnits.length === 0) return null;

    let bestTarget = null;
    let bestScore = -1;

    enemyUnits.forEach(u => {
        let score = 10; // Baza

        switch (mutationType) {
            case 'CHLOROPLASTS':
                // Najlepiej dawać Chloroplasty powolnym / wytrzymałym jednostkom, które pożyją długo
                if (u.type === 'spore') score += 40;
                if (u.type === 'bacteria' || u.type === 'tardigrade') score += 20;
                if (u.traits.photosynthesis) score -= 50; // Unikamy dublowania, jeśli nie trzeba
                break;

            case 'APOPTOSIS':
                // Najlepiej na szybkie, tanie jednostki, lub te, które są bardzo blisko wroga
                if (u.type === 'bacteriophage' || u.type === 'virus' || u.type === 'paramecium') score += 30;
                const isCloseToEnemy = playerUnits.some(pu => Math.hypot(pu.x - u.x, pu.y - u.y) < 150);
                if (isCloseToEnemy) score += 20; // Jeśli zaraz wybuchnie, to świetnie!
                if (u.traits.kamikaze) score = -100; // Nie dublujemy apoptozy!
                break;

            case 'LIPIDS':
                // Najlepiej na "żywe tarcze" by zrobić je nieprzesuwalnymi
                if (u.type === 'erythrocyte' || u.type === 'spore') score += 30;
                if (u.type === 'bacteriophage' || u.type === 'virus') score -= 20; // Nie chcemy spowalniać szybkich!
                break;

            case 'MITOSIS':
                // Klonujemy jednostki drogie i już mocno zmutowane
                score += (UNIT_TYPES[u.type].cost * 5);
                score += (u.appliedMutations.length * 10);
                break;

            case 'CORDYCEPS':
                // Rzucamy na "mięso armatnie", które zaraz zginie (frontlinerzy)
                if (u.type === 'macrophage' || u.type === 'bacteria') score += 15;
                if (u.hp < u.maxHp * 0.5) score += 25; // Im mniej HP, tym szybciej odpali się Cordyceps
                if (u.traits.necromancy) score = -100; // Bez dublowania
                break;

            case 'SPEED_BOOST':
            case 'FLAGELLA':
                // Wici przydadzą się powolnym grubasom
                if (u.type === 'amoeba' || u.type === 'macrophage') score += 25;
                break;

            case 'REGEN_ENZYMES':
                if (u.traits.regeneration) score = -100;
                if (u.hp < u.maxHp) score += 20; // Ranni priorytet
                if (u.maxHp > 20) score += 10;   // Opłaca się na tankach
                break;
        }

        if (score > bestScore) {
            bestScore = score;
            bestTarget = u;
        }
    });

    if (bestScore <= 0) return null; // Jeśli nie ma dobrego celu, AI wstrzyma się z rzuceniem karty
    return { unit: bestTarget, score: bestScore };
}