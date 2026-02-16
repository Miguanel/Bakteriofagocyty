import { state } from './GameState.js';
import { UNIT_TYPES, MUTATION_TYPES } from './constants.js'; // Dodano MUTATION_TYPES
import { Unit } from './Unit.js';
import { canvas } from './Canvas.js';
import { updateUI, renderHands, showDamageNumber } from './UI.js'; // Dodano showDamageNumber do efektów

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function spawnEnemyTurn() {
    updateUI();
    let attempts = 0;

    // Pętla decyzyjna AI
    // Próbuje wykonać ruch dopóki ma karty, ATP i nie przekroczył limitu prób
    while (state.enemyATP >= 2 && attempts < 10 && state.enemyHand.length > 0) {

        await sleep(600); // Czas na "myślenie"

        // 1. ZNAJDŹ WSZYSTKIE MOŻLIWE RUCHY
        // Tworzymy listę obiektów { card, index, actionType, target? }
        let possibleMoves = [];

        state.enemyHand.forEach((card, index) => {
            // A. Czy to JEDNOSTKA i czy nas stać?
            if (card.category === 'unit') {
                if (UNIT_TYPES[card.type].cost <= state.enemyATP) {
                    possibleMoves.push({
                        type: 'SPAWN_UNIT',
                        card: card,
                        index: index,
                        cost: UNIT_TYPES[card.type].cost
                    });
                }
            }
            // B. Czy to MUTACJA i czy nas stać?
            else if (card.category === 'mutation') {
                if (MUTATION_TYPES[card.type].cost <= state.enemyATP) {
                    // Dla mutacji musimy znaleźć pasujący cel (własną jednostkę)
                    const target = findBestTargetForMutation(card.type);
                    if (target) {
                        possibleMoves.push({
                            type: 'APPLY_MUTATION',
                            card: card,
                            index: index,
                            cost: MUTATION_TYPES[card.type].cost,
                            target: target
                        });
                    }
                }
            }
        });

        // Jeśli nie ma żadnych możliwych ruchów - kończymy turę
        if (possibleMoves.length === 0) break;

        // 2. WYBIERZ RUCH (Losowo z dostępnych)
        // Można tu dodać logikę priorytetów, na razie full random dla nieprzewidywalności
        const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

        // 3. WYKONAJ RUCH
        if (move.type === 'SPAWN_UNIT') {
            // --- SPAWNOWANIE ---
            const spawnX = 50 + Math.random() * (canvas.width - 100);
            const spawnY = 60 + (Math.random() * 50);
            const spawnAngle = (Math.PI / 2) + (Math.random() - 0.5);

            state.units.push(new Unit(spawnX, spawnY, move.card.type, 'enemy', spawnAngle));

            console.log(`AI: Spawnuje ${move.card.type}`);

        } else if (move.type === 'APPLY_MUTATION') {
            // --- MUTACJA ---
            move.target.applyGeneticCard(move.card.type);

            // Efekt wizualny (Tekst nad jednostką)
            showDamageNumber(`${move.card.type}`, move.target.x, move.target.y, '#e84118');

            console.log(`AI: Używa ${move.card.type} na jednostce.`);
        }

        // 4. PŁATNOŚĆ I SPRZĄTANIE
        state.enemyATP -= move.cost;

        // Usuwamy użytą kartę z ręki
        // (Uwaga: splice zmienia indeksy, ale w każdej pętli liczymy possibleMoves od nowa, więc jest OK)
        state.enemyHand.splice(move.index, 1);

        updateUI();
        renderHands(); // Aktualizacja widoku ręki wroga
        attempts++;
    }

    await sleep(500);
}

// --- FUNKCJA POMOCNICZA: INTELIGENTNY WYBÓR CELU ---
function findBestTargetForMutation(mutationType) {
    // Filtrujemy tylko żywe jednostki wroga
    const myUnits = state.units.filter(u => u.owner === 'enemy' && u.hp > 0 && !u.isDormant);

    if (myUnits.length === 0) return null;

    if (mutationType === 'REGEN_ENZYMES') {
        // Cel: Jednostka, która NIE ma jeszcze regeneracji i jest ranna (opcjonalnie)
        // Szukamy takich bez cechy regeneracji
        const candidates = myUnits.filter(u => !u.traits.regeneration);
        if (candidates.length === 0) return null; // Wszyscy już mają regen

        // Wybieramy losowego kandydata (lub najbardziej rannego)
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Dla TANK_DNA i innych buffów - po prostu losowa jednostka
    // (Można ulepszyć: TANK_DNA dawaj tym z małym HP, żeby ich uleczyć)
    return myUnits[Math.floor(Math.random() * myUnits.length)];
}