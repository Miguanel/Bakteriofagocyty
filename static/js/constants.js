export const UNIT_TYPES = {
    'virus': {
        cost: 2, radius: 18, mass: 0.8, baseSpeed: 8, atk: 4, hp: 5,
        icon: '🦠', color: '#8e44ad', income: 1,
        description: "Szybki i tani intruz. Idealny do ataków z zaskoczenia."
    },
    'bacteria': {
        cost: 4, radius: 28, mass: 2.5, baseSpeed: 4, atk: 3, hp: 12,
        icon: '💊', color: '#27ae60', income: 2,
        description: "Solidny organizm. Stabilne źródło energii w szalce."
    },
    'tardigrade': {
        cost: 7, radius: 38, mass: 8, baseSpeed: 1.5, atk: 2, hp: 50,
        icon: '🐛', color: '#d35400', income: 5,
        description: "Niezniszczalny. Po śmierci zapada w stan anabiozy."
    },
    'macrophage': {
        cost: 6, radius: 35, mass: 5.0, baseSpeed: 2.5, atk: 8, hp: 25,
        icon: '🩸', color: '#c0392b', income: 1,
        description: "Ciężki strażnik. Pożera wrogów potężnymi atakami."
    },
    'spore': {
        cost: 3, radius: 20, mass: 10.0, baseSpeed: 0, atk: 0, hp: 30,
        icon: '🍄', color: '#7f8c8d', income: 6,
        description: "Nieruchomy przetrwalnik. Generuje potężny dochód."
    },
    'paramecium': {
        cost: 3, radius: 22, mass: 1.2, baseSpeed: 10, atk: 5, hp: 3,
        icon: '🥏', color: '#2980b9', income: 2,
        description: "Zwinny pływak. Bardzo szybki, ale niezwykle kruchy."
    },
    'amoeba': {
        cost: 6, radius: 45, mass: 12.0, baseSpeed: 1.0, atk: 7, hp: 40,
        icon: '🦠', color: '#9b59b6', income: 3,
        description: "Ogromny, powolny gigant. Miażdży wrogów swoją masą."
    },
    'bacteriophage': {
        cost: 4, radius: 15, mass: 0.5, baseSpeed: 12.0, atk: 12, hp: 2,
        icon: '🕷️', color: '#34495e', income: 0,
        description: "Szklana armata. Ekstremalnie szybki i zabójczy."
    },
    'erythrocyte': {
        cost: 2, radius: 25, mass: 3.0, baseSpeed: 3.0, atk: 0, hp: 35,
        icon: '🔴', color: '#e74c3c', income: 1,
        description: "Tania żywa tarcza. Nie potrafi atakować."
    },
    'flower': {
        cost: 3, radius: 26, mass: 15.0, baseSpeed: 0, atk: 0, hp: 15,
        icon: '🌸', color: '#ff9ff3', income: 5,
        description: "Kosmiczna Flora. Nieruchomy i bezbronny, ale generuje dużo ATP."
    },
    'trichocyst': {
        cost: 5, radius: 24, mass: 15.0, baseSpeed: 0, atk: 12, hp: 20,
        icon: '👁️', color: '#00cec9', income: 0, range: 150,
        description: "Bio-Wieżyczka. Nieruchoma, strzela kwasem we wrogów na dystans!"
    },
    // --- NOWOŚĆ: RDZEŃ KOLONII ---
    'core_base': {
        cost: 0, radius: 42, mass: 15000, baseSpeed: 0.8, atk: 0, hp: 500,
        icon: '🌍', color: '#000', income: 0,
        description: "Rdzeń Kolonii. Jeśli zginie, przegrywasz wojnę!"
    }
};

export const MUTATION_TYPES = {
    'TANK_DNA': { cost: 5, label: "Gen Tanka", icon: "🛡️", description: "Mnoży HP i masę jednostki (+50%)." },
    'REGEN_ENZYMES': { cost: 4, label: "Enzymy", icon: "❤️‍🩹", description: "Pozwala jednostce powoli regenerować zdrowie." },
    'SPEED_BOOST': { cost: 3, label: "Turbo", icon: "⚡", description: "Znacznie zwiększa bazową prędkość ruchu." },
    'CELL_WALL': { cost: 4, label: "Ściana Kom.", icon: "🧱", description: "Twarda powłoka zadająca rany atakującym wrogom." },
    'TOXIN_PLASMID': { cost: 3, label: "Toksyna", icon: "☠️", description: "Zwiększa siłę ataku kosztem punktów życia." },
    'FLAGELLA': { cost: 2, label: "Wici", icon: "〰️", description: "Poprawia zwrotność i przyspieszenie komórki." },
    'MITOSIS': { cost: 8, label: "Mitoza", icon: "➗", description: "Tworzy identycznego klona wraz z mutacjami!" },
    'CHLOROPLASTS': { cost: 3, label: "Chloroplasty", icon: "🌿", description: "Fotosynteza: Generuje dodatkowe +3 ATP na szalce." },
    'APOPTOSIS': { cost: 4, label: "Apoptoza", icon: "💥", description: "+15 ATK. Jednostka wybucha (ginie) podczas ataku." },
    'CORDYCEPS': { cost: 6, label: "Cordyceps", icon: "🧟", description: "Gdy jednostka ginie, wskrzesza się z niej Wirus." },
    'LIPIDS': { cost: 2, label: "Lipidy", icon: "🟡", description: "+20 HP i masa, ale zatrzymuje ruch." },
    'SYMBIOSIS': { cost: 5, label: "Symbioza", icon: "🤝", description: "+15 HP i produkuje +2 ATP co turę." },
    'PREDATOR_DNA': { cost: 6, label: "Drapieżnik", icon: "🐅", description: "+10 ATK i +30% Szybkości." },
    'SPIKED_ARMOR': { cost: 6, label: "Kolczuga", icon: "🦔", description: "+20 HP i zadaje obrażenia dotykowe." },
    'MUTANT_BLOOD': { cost: 7, label: "Krew Mutanta", icon: "🧪", description: "Zapewnia Regenerację oraz +5 ATK." },
    'SLIME_CAPSULE': {
        cost: 6, label: "Kapsuła Śluzowa", icon: "🧿",
        description: "Potężna tarcza. Jednostka odbija strzały i ma +40 HP."
    }
};

export const TURN_DURATION = 3000;
export const INCOME_PER_TURN = 0;
export const PHASES = {
    PLAYER_PLANNING: 'PLAYER_PLANNING',
    PLAYER_COMBAT: 'PLAYER_COMBAT',
    ENEMY_PLANNING: 'ENEMY_PLANNING',
    ENEMY_COMBAT: 'ENEMY_COMBAT'
};