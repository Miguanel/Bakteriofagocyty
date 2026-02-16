import random


class Organism:
    def __init__(self, name, x, y):
        self.name = name
        self.x = x
        self.y = y

        # --- Statystyki Podstawowe ---
        self.max_hp = 100.0
        self.current_hp = 100.0
        self.speed = 2.0
        self.size = 10.0  # Rozmiar (wpływa na hitbox)
        self.color = (0, 255, 0)  # Zielony (RGB)

        # --- Genetyka (Cechy Pasywne) ---
        # Tutaj trzymamy flagi, czy dana umiejętność jest "włączona"
        self.traits = {
            "regeneration": False,  # Czy leczy się co klatkę?
            "thorns": False,  # Czy zadaje obrażenia przy dotyku?
            "photosynthesis": False  # Czy odzyskuje energię stojąc w miejscu?
        }

    def update(self):
        """
        Ta metoda musi być wywoływana w każdej klatce gry (Game Loop).
        Obsługuje pasywne umiejętności.
        """

        # LOGIKA: Regeneracja (Enzymy Naprawcze)
        if self.traits["regeneration"]:
            if self.current_hp < self.max_hp:
                heal_amount = 0.5  # Pół punktu życia na klatkę
                self.current_hp += heal_amount

                # Zabezpieczenie przed przekroczeniem MAX
                if self.current_hp > self.max_hp:
                    self.current_hp = self.max_hp

        # LOGIKA: Fotosynteza (opcjonalnie)
        # if self.traits["photosynthesis"]:
        #     self.energy += 0.1

    def apply_genetic_card(self, card_type):
        """
        Metoda aplikująca kartę modyfikacji genetycznej.
        """
        print(f"🧬 Aplikowanie modyfikacji: {card_type} na {self.name}...")

        if card_type == "CELL_WALL_V2":
            # Nazwa: Gruba Ściana Komórkowa
            # Efekt: Zwiększa HP o 50% i leczy
            bonus = self.max_hp * 0.5
            self.max_hp += bonus
            self.current_hp += bonus  # Leczy o wartość bonusu
            self.size += 2  # Organizm robi się fizycznie większy
            print(f"   -> Max HP wzrosło do {self.max_hp}")

        elif card_type == "REPAIR_ENZYMES":
            # Nazwa: Enzymy Naprawcze
            # Efekt: Włącza regenerację
            self.traits["regeneration"] = True
            self.color = (0, 255, 255)  # Zmiana koloru na turkusowy (wizualny efekt)
            print("   -> Uruchomiono szlak metaboliczny regeneracji!")

        elif card_type == "TURBO_FLAGELLA":
            # Nazwa: Nadaktywna Wić
            # Efekt: Szybkość +40%
            self.speed *= 1.4
            print(f"   -> Prędkość wzrosła do {self.speed:.2f}")

        elif card_type == "TOXIN_GLAND":
            # Nazwa: Gruczoł Toksyczny (Kolce)
            # Efekt: Zadaje obrażenia atakującym
            self.traits["thorns"] = True
            self.color = (255, 0, 0)  # Zmiana koloru na czerwony (ostrzegawczy)
            print("   -> Organizm stał się toksyczny dla dotykających!")

    def take_damage(self, amount):
        self.current_hp -= amount
        print(f"💥 {self.name} otrzymał {amount} dmg. HP: {self.current_hp}/{self.max_hp}")