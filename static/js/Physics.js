import { state } from './GameState.js';
import { canvas } from './Canvas.js';

export function resolveCollisions() {
    const units = state.units;
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            const u1 = units[i];
            const u2 = units[j];

            const dx = u2.x - u1.x;
            const dy = u2.y - u1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = u1.radius + u2.radius;

            if (dist < minDist && dist > 0) {
                // 1. ROZDZIELENIE POZYCJI
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                const totalMass = u1.mass + u2.mass;
                const m1Ratio = u2.mass / totalMass;
                const m2Ratio = u1.mass / totalMass;

                u1.x -= nx * overlap * m1Ratio;
                u1.y -= ny * overlap * m1Ratio;
                u2.x += nx * overlap * m2Ratio;
                u2.y += ny * overlap * m2Ratio;

                // 2. FIZYKA ODBICIA
                const tx = -ny;
                const ty = nx;

                const dpNorm1 = u1.vx * nx + u1.vy * ny;
                const dpTan1  = u1.vx * tx + u1.vy * ty;
                const dpNorm2 = u2.vx * nx + u2.vy * ny;
                const dpTan2  = u2.vx * tx + u2.vy * ty;

                if (dpNorm1 - dpNorm2 > 0) {
                    const m1 = u1.mass;
                    const m2 = u2.mass;

                    const m1p = (dpNorm1 * (m1 - m2) + 2 * m2 * dpNorm2) / (m1 + m2);
                    const m2p = (dpNorm2 * (m2 - m1) + 2 * m1 * dpNorm1) / (m1 + m2);

                    u1.vx = tx * dpTan1 + nx * m1p;
                    u1.vy = ty * dpTan1 + ny * m1p;
                    u2.vx = tx * dpTan2 + nx * m2p;
                    u2.vy = ty * dpTan2 + ny * m2p;
                }

                // 3. PRAWDZIWE OBRAŻENIA BITWE (Tylko na arenie i między wrogami)
                if (state.phase !== 'LAB_MODE' && u1.owner !== u2.owner) {
                    // Sprawdzamy cooldown, żeby jednostki nie zadały sobie obrażeń 4 razy w ułamku sekundy
                    if (u1.damageCooldown <= 0 && u2.damageCooldown <= 0) {

                        // Zadają sobie obrażenia równe swojemu atakowi!
                        u1.hp -= u2.atk;
                        u2.hp -= u1.atk;

                        // Kolce (Thorns) zadają dodatkowe 2 pkt obrażeń "kłutych"
                        if (u1.traits && u1.traits.thorns) u2.hp -= 2;
                        if (u2.traits && u2.traits.thorns) u1.hp -= 2;

                        // Apoptoza (Kamikaze) - jednostka wybucha przy uderzeniu!
                        if (u1.traits && u1.traits.kamikaze) u1.hp = 0;
                        if (u2.traits && u2.traits.kamikaze) u2.hp = 0;

                        // Ustawiamy krótki czas "odporności" na kolejne rany (100 ms) po silnym zderzeniu
                        u1.damageCooldown = 100;
                        u2.damageCooldown = 100;
                    }
                }
            }
        }
    }
}

export function resolveCircularBounds() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 200; // Promień szalki

    state.units.forEach(u => {
        const dx = u.x - cx;
        const dy = u.y - cy;
        const dist = Math.hypot(dx, dy);

        if (dist + u.radius > radius) {
            // 1. Wypchnięcie ze ściany (żeby jednostka nie ugrzęzła za burtą)
            const overlap = dist + u.radius - radius;
            const nx = dx / dist; // Wektor normalny X (od środka szalki do krawędzi)
            const ny = dy / dist; // Wektor normalny Y

            u.x -= nx * overlap;
            u.y -= ny * overlap;

            // 2. FIZYKA KRZYWOLINIOWEGO ODBICIA
            // Iloczyn skalarny prędkości i wektora normalnego
            const dotProduct = u.vx * nx + u.vy * ny;

            // Odbijamy wektor prędkości względem krzywizny ściany
            // (Warunek dotProduct > 0 upewnia się, że nie "przykleimy" jednostki do ściany)
            if (dotProduct > 0) {
                const bounciness = 0.8; // Zachowujemy 80% prędkości po odbiciu
                u.vx = (u.vx - 2 * dotProduct * nx) * bounciness;
                u.vy = (u.vy - 2 * dotProduct * ny) * bounciness;
            }
        }
    });
}