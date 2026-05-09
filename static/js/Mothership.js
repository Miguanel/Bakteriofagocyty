export class Mothership {
    constructor(owner, x, y, color) {
        this.owner = owner;
        this.x = x;
        this.y = y;
        this.color = color;

        // --- GABARYTY ---
        this.radius = 50; // Komórka Matka jest masywna
        this.mass = 1000; // Prawie nie do ruszenia na arenie

        // --- STATYSTYKI GŁÓWNE ---
        this.maxHp = 500;
        this.hp = 500;

        // Pancerz fizyczny (zmniejsza uderzenia ze zderzeń)
        this.armor = 5;

        // Specjalna powłoka antymutagenna/wirusowa (działa jak niebieska tarcza)
        this.maxVirusShield = 100;
        this.virusShield = 100;

        // --- EKONOMIA I SKANER ---
        this.baseIncome = 5; // Podstawowy przychód ATP co turę/tick
        this.scannerRadius = 200; // Zasięg "wzroku" i strzału
        this.scanAngle = 0; // Zmienna do płynnej animacji radaru

        // --- MODUŁY DOCZEPIANE (Dzieci Komórki Matki) ---
        this.turrets = []; // Tablica na "Trykocysty" / Działka
        this.walls = [];   // Tablica na "Mury Chitynowe" / Kapsuły Śluzowe
    }

    // Dodawanie nowej wieżyczki do matki
    addTurret(type, damage, range) {
        this.turrets.push({
            type: type,
            hp: 50,
            maxHp: 50,
            damage: damage,
            range: range,
            cooldown: 0,
            // Pozycja relatywna względem środka matki
            angleOffset: Math.random() * Math.PI * 2
        });
    }

    // Funkcja przyjmująca uderzenia (z podziałem na typy!)
    takeDamage(amount, type = 'physical') {
        if (type === 'viral' && this.virusShield > 0) {
            // Wirusy najpierw zjadają specjalną tarczę
            this.virusShield -= amount;
            if (this.virusShield < 0) {
                this.hp += this.virusShield; // Nadmiar przechodzi na HP
                this.virusShield = 0;
            }
        } else {
            // Obrażenia fizyczne są redukowane przez pancerz
            const finalDamage = Math.max(1, amount - this.armor);
            this.hp -= finalDamage;
        }
    }

    // Aktualizacja logiki w każdej klatce
    update(deltaTime) {
        // Obracanie skanera
        this.scanAngle += deltaTime * 0.001;

        // Logika wieżyczek (strzelanie, odnawianie cooldownu)
        this.turrets.forEach(turret => {
            if (turret.cooldown > 0) {
                turret.cooldown -= deltaTime;
            }
            // (Tutaj w przyszłości dodamy logikę wyszukiwania wrogów w zasięgu `this.scannerRadius`)
        });

        // Regeneracja powłoki wirusowej (jeśli nie jest zniszczona)
        if (this.virusShield > 0 && this.virusShield < this.maxVirusShield) {
            this.virusShield += deltaTime * 0.005;
        }
    }

    // Rysowanie Komórki Matki na płótnie areny
    draw(ctx) {
        ctx.save();

        // 1. Obszar Skanera (Radar wokół bazy)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.scannerRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, 0.03)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.setLineDash([5, 15]);
        ctx.stroke();

        // Linia skanująca radaru
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.scannerRadius, this.scanAngle, this.scanAngle + 0.3);
        ctx.lineTo(this.x, this.y);
        ctx.fillStyle = `${this.color}22`; // Kolor gracza z dużą przezroczystością
        ctx.fill();

        // 2. Błona Antywirusowa (Tarcza)
        if (this.virusShield > 0) {
            ctx.beginPath();
            // Grubość tarczy zależy od jej stanu
            const shieldSize = this.radius + 15 + (this.virusShield / this.maxVirusShield) * 10;
            ctx.arc(this.x, this.y, shieldSize, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'; // Turkusowa tarcza
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.stroke();
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'cyan';
        }

        // 3. Główny korpus Komórki Matki
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#111'; // Ciemne wnętrze
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = this.color; // Kolor frakcji
        ctx.stroke();

        // 4. Rysowanie wieżyczek na orbicie korpusu
        this.turrets.forEach(turret => {
            const tx = this.x + Math.cos(turret.angleOffset + this.scanAngle) * (this.radius + 5);
            const ty = this.y + Math.sin(turret.angleOffset + this.scanAngle) * (this.radius + 5);

            ctx.beginPath();
            ctx.arc(tx, ty, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#c0392b'; // Czerwone działka
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // 5. Tekst z HP
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(`❤️ ${Math.ceil(this.hp)}`, this.x, this.y - 10);
        if (this.virusShield > 0) {
            ctx.fillStyle = '#00ffff';
            ctx.fillText(`🛡️ ${Math.ceil(this.virusShield)}`, this.x, this.y + 10);
        }

        ctx.restore();
    }
}