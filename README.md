# JZD - Jeden z Dziesięciu

Nowoczesna aplikacja webowa do gry quizowej wzorowanej na kultowym teleturnieju **Jeden z dziesięciu**.

Projekt wspiera rozgrywkę dla **4–15 graczy**, posiada bazę ponad **5000 pytań** (`data/questions.json`) i oferuje dwa tryby:
1. **Tryb Towarzyski (Lokalny / Imprezowy):** Mistrz Gry prowadzi rozgrywkę z pomocą asystenta (pytania, zegar 30s, punktacja, szanse, opcjonalny widok TV).
2. **Tryb Interaktywny (Pokoje Online):** Mistrz Gry zakłada pokój, gracze dołączają na smartfonach przez link/PIN, korzystają z wirtualnego buzzera 10s w finale oraz wpisują odpowiedzi na pytania otwarte (z weryfikacją przez Mistrza Gry).

---

## Szczegółowy Plan i Zasady

Pełny opis etapów, reguł punktacji, maszyny stanów oraz harmonogramu prac znajduje się w pliku:
👉 **[PLAN.md](PLAN.md)**

---

## Architektura i Stos Technologiczny

* **Backend:** Node.js, TypeScript, Fastify, Socket.IO
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion
* **Dźwięk:** Howler.js / Web Audio API
* **Baza danych pytań:** `data/questions.json` (5079 pytań z kategoriami)
