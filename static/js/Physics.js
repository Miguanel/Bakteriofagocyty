import { state } from './GameState.js';
import { canvas } from './Canvas.js';

export function resolveCollisions() {
    const units = state.units;
    if (!units || !Array.isArray(units)) return;
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

                // Rdzenie kolonii (mass 15000) nie dadzą się zepchnąć małym jednostkom
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

                // 3. PRAWDZIWE OBRAŻENIA W BITWIE
                if (state.phase !== 'LAB_MODE' && u1.owner !== u2.owner) {
                    if (u1.damageCooldown <= 0 && u2.damageCooldown <= 0) {
                        u1.hp -= u2.atk;
                        u2.hp -= u1.atk;

                        if (u1.traits && u1.traits.thorns) u2.hp -= 2;
                        if (u2.traits && u2.traits.thorns) u1.hp -= 2;
                        if (u1.traits && u1.traits.kamikaze) u1.hp = 0;
                        if (u2.traits && u2.traits.kamikaze) u2.hp = 0;

                        u1.damageCooldown = 100;
                        u2.damageCooldown = 100;
                    }
                }
            }
        }
    }
}

// --- NAPRAWIONO: Fizyka kształtu orzeszka (zgodnie ze screenem!) ---
export function resolveArenaBounds() {
    const cx1 = 280, cx2 = 520, cy = 225, r = 170;

    state.units.forEach(u => {
        const d1 = Math.hypot(u.x - cx1, u.y - cy);
        const d2 = Math.hypot(u.x - cx2, u.y - cy);

        // Jeśli komórka wyleciała poza OBA koła areny
        if (d1 > r - u.radius && d2 > r - u.radius) {
            // Wepchnij do tego, do którego ma bliżej
            const targetCx = d1 < d2 ? cx1 : cx2;
            const d = Math.hypot(u.x - targetCx, u.y - cy);

            if (d > 0) {
                const overlap = d + u.radius - r;
                const nx = (u.x - targetCx) / d;
                const ny = (u.y - cy) / d;

                u.x -= nx * overlap;
                u.y -= ny * overlap;

                const dotProduct = u.vx * nx + u.vy * ny;
                if (dotProduct > 0) {
                    const bounciness = 0.9;
                    u.vx = (u.vx - 2 * dotProduct * nx) * bounciness;
                    u.vy = (u.vy - 2 * dotProduct * ny) * bounciness;
                }
            }
        }
    });
}

export function resolveCircularBounds() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 200;

    state.units.forEach(u => {
        const dx = u.x - cx;
        const dy = u.y - cy;
        const dist = Math.hypot(dx, dy);

        if (dist + u.radius > radius) {
            const overlap = dist + u.radius - radius;
            const nx = dx / dist;
            const ny = dy / dist;

            u.x -= nx * overlap;
            u.y -= ny * overlap;

            const dotProduct = u.vx * nx + u.vy * ny;
            if (dotProduct > 0) {
                const bounciness = 0.8;
                u.vx = (u.vx - 2 * dotProduct * nx) * bounciness;
                u.vy = (u.vy - 2 * dotProduct * ny) * bounciness;
            }
        }
    });
}