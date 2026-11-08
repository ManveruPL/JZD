# 🏆 JZD - Jeden z Dziesięciu

Nowoczesna, w pełni interaktywna aplikacja webowa do gry quizowej czasu rzeczywistego wzorowanej na kultowym polskim teleturnieju **Jeden z dziesięciu**.

Aplikacja jest przystosowana do rozgrywek od **4 do 15 uczestników**, oferuje dedykowany **ekran TV / Rzutnik**, pełny **syntetyzator efektów dźwiękowych Web Audio API**, bazę **ponad 11 000 zweryfikowanych pytań** oraz dwa komplementarne tryby rozgrywki.

---

## 🎮 Tryby Rozgrywki

### 1. Tryb Towarzyski (Domowy / Imprezowy / Pub Quiz)
Dedykowany do rozgrywek na żywo w gronie znajomych lub w pubie:
* **Pulpit Mistrza Gry**: Prowadzący czyta pytania z ekranu laptopa lub tabletu, widzi poprawną odpowiedź wraz z formami alternatywnymi (`aliases`) oraz zarządza szansami i punktacją zawodników.
* **Wygodne sterowanie klawiaturą**:
  * `Spacja`: start / pauza zegara odpowiedzi,
  * `1` lub `Enter`: zatwierdzenie poprawnej odpowiedzi (+punkty/przejście),
  * `2` lub `Escape`: zarejestrowanie błędnej odpowiedzi (utrata szansy),
  * Klawisze numeryczne: szybkie wyznaczanie rywali ze stanowisk.
* **Drugi Ekran (Projektor / TV)**: Dedykowany widok studyjny (`/?tv=KOD`), na którym publiczność i gracze widzą stanowiska z podświetleniem aktywnego gracza, znikające szanse, duży zegar odliczający czas oraz treść pytania (bez zdradzania odpowiedzi!).

### 2. Tryb Interaktywny (Pokoje Online na Smartfony)
Pełna automatyzacja teleturnieju z udziałem smartfonów graczy:
* **Dołączanie przez Kod QR i PIN**: Na ekranie TV w fazie oczekiwania wyświetla się dynamiczny kod QR oraz kod PIN pokoju. Gracze skanują kod aparatem w telefonie i natychmiast trafiają na swoje stanowisko.
* **Wirtualny Buzzer w Finale**: W Etapie 3 (Wielki Finał) smartfony uczestników zamieniają się w czuły przycisk zgłoszeniowy (10s buzzer) o minimalnym opóźnieniu i wibracji haptic.
* **Odpowiedzi tekstowe na telefonie**: Gracze wpisują odpowiedzi na swoich urządzeniach, a inteligentny asystent Mistrza Gry analizuje podobieństwo tekstu (algorytm Levenshteina / N-gram) i sugeruje werdykt do zatwierdzenia jednym kliknięciem.
* **Wskazywanie rywali i branie pytań "na siebie"**: Ocalali zawodnicy wyznaczają przeciwników lub biorą pytania na siebie (+20 pkt w finale) bezpośrednio na ekranie smartfona.

---

## 🧠 Zasady Gry (Zgodne z Teleturniejem)

Rozgrywka odwzorowuje trzy klasyczne etapy teleturnieju:

```
[ LOBBY ] ──> [ ETAP 1: Eliminacje ] ──> [ ETAP 2: Wskazywanie ] ──> [ ETAP 3: Wielki Finał ] ──> [ PODSUMOWANIE ]
              (2 kolejki pytań,           (wyznaczanie rywali,        (część otwarta z buzzerem,   (podium, statystyki,
               min. 1 poprawna)            do 3 ocalałych)             następnie wyznaczanie)       eksport CSV/JSON)
```

1. **Etap 1 (Eliminacje)**: Każdy gracz otrzymuje 3 szanse i odpowiada na 2 pytania po kolei. Aby awansować do kolejnego etapu, gracz musi odpowiedzieć poprawnie na co najmniej jedno pytanie (dwie błędne odpowiedzi eliminują z gry).
2. **Etap 2 (Wskazywanie)**: Gracze zachowują ocalałe szanse. Gracz z poprawną odpowiedzią zyskuje prawo wyznaczenia dowolnego aktywnego rywala. Błędna odpowiedź oznacza utratę szansy. Etap trwa do momentu wyłonienia dokładnie 3 finalistów.
3. **Etap 3 (Wielki Finał)**:
   - Finaliści startują z punktami równymi zachowanym szansom.
   - Pula pytań finałowych wynosi 40 pytań (konfigurowalna).
   - **Faza Otwarta**: Pytania do wszystkich z 10-sekundowym buzzerem (+10 pkt za poprawną, utrata 1 szansy za błąd). Trwa do momentu zdobycia przez dowolnego gracza ponad 30 punktów.
   - **Faza Wyznaczania**: Zawodnik z głosem może wskazać rywala (+10 pkt) lub wziąć pytanie **na siebie (+20 pkt)**.
   - Na koniec doliczany jest bonus **+10 punktów za każdą zachowaną szansę**. Zwycięża gracz z najwyższym wynikiem punktowym.

---

## ⚙️ Zaawansowana Konfiguracja i Opcje Gry

Mistrz Gry przed rozpoczęciem teleturnieju w lobby może dostosować:
* **Czas na odpowiedź**: 15s / 20s / 30s / 40s,
* **Czas na zgłoszenie buzzerem**: 5s / 7s / 10s / 15s,
* **Liczbę pytań w finale**: 20 / 30 / 40 pytań,
* **Liczbę początkowych szans**: 2 lub 3,
* **Filtrowanie kategorii**: możliwość wyboru konkretnych dziedzin wiedzy (np. historia, geografia, nauka, sztuka, sport, literatura) lub gra z pełnej puli.

---

## 🔊 Efekty Dźwiękowe (Web Audio API)

Aplikacja zawiera wbudowany syntezator dźwięków działający bezpośrednio w przeglądarce bez konieczności pobierania zewnętrznych plików audio:
* Tykanie zegara (z akcentami co sekundę),
* Sygnał ostrzegawczy przy ostatnich 5 sekundach,
* Gong poprawnej odpowiedzi,
* Syrena błędu,
* Dźwięk utraty szansy,
* Dźwięk wciśnięcia buzzera,
* Werbel finałowy (drumroll) przed ogłoszeniem zwycięzcy,
* Fanfara teleturniejowa na zakończenie gry,
* Płynna regulacja głośności z zapamiętywaniem stanu w `localStorage`.

---

## 📊 Statystyki i Eksport Wyników

Po wyłonieniu zwycięzcy dostępny jest szczegółowy moduł analityczny:
* **Podium i klasyfikacja końcowa**,
* **Szczegółowa tabela graczy**: skuteczność procentowa (accuracy %), liczba pytań trafionych i błędnych, liczba decyzji "biorę na siebie", etap odpadnięcia,
* **Eksport danych**:
  * **Pobierz CSV** (zabezpieczony przed Formula Injection CWE-1236),
  * **Pobierz JSON** (pełna struktura stanu gry do dalszej integracji),
  * **Kopiuj Raport** (sformatowany raport Markdown gotowy do wklejenia na Discorda / Slacka),
  * **Drukuj / Zapisz jako PDF** (dedykowany styl CSS print).

---

## 🛡️ Architektura i Bezpieczeństwo

Aplikacja została poddana pełnemu audytowi bezpieczeństwa metodologią **Cloudflare & OWASP**:
* **Brak wycieków bazy pytań**: Pytania i odpowiedzi przechowywane są wyłącznie w pamięci serwera; wyeliminowano statyczne serwowanie plików bazy.
* **Ochrona HTTP i CSP**: Zarejestrowany `@fastify/helmet` z restrykcyjnym `Content-Security-Policy`, blokadą Clickjackingu (`X-Frame-Options: SAMEORIGIN`) oraz `X-Content-Type-Options: nosniff`.
* **Ochrona przed DoS i wyczerpaniem pamięci**: Zarejestrowany `@fastify/rate-limit`, globalny limit równoległych pokojów w pamięci (`MAX_ROOMS = 100`), limit tworzenia pokojów na socket oraz automatyczny garbage collector usuwający pokoje porzucone przez ponad 2 godziny.
* **Walidacja wejścia**: Twarde ograniczenia długości imion (max 30 znaków), odpowiedzi tekstowych (max 200 znaków) oraz sanityzacja typów parametrów Socket.IO.
* **CORS**: Elastyczna i bezpieczna konfiguracja za pośrednictwem zmiennej środowiskowej `CORS_ORIGIN`.

### Stos Technologiczny
* **Serwer**: Node.js 22+, TypeScript, Fastify, Socket.IO
* **Klient**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
* **Testy**: Vitest (50 testów jednostkowych i integracyjnych), Playwright (7 testów E2E w trybie headless)

---

## 🚀 Uruchomienie Lokalne

### Wymagania
* Node.js v20+ (rekomendowany v22+)
* npm v10+

### Instalacja i start w trybie deweloperskim
```bash
# 1. Klonowanie repozytorium
git clone git@github.com:ManveruPL/JZD.git
cd JZD

# 2. Instalacja zależności
npm install

# 3. Uruchomienie serwera i klienta (jeden proces deweloperski)
npm run dev
```

Aplikacja będzie dostępna pod adresem:
* **Frontend**: `http://localhost:3000`
* **Backend API & WebSocket**: `http://localhost:3001`

### Komendy pomocnicze
```bash
npm run typecheck      # Weryfikacja typów TypeScript (klient i serwer)
npm test               # Uruchomienie 50 testów jednostkowych Vitest
npm run test:e2e       # Uruchomienie 7 testów E2E Playwright
npm run build          # Kompilacja produkcyjna (klient + serwer)
npm run start:prod     # Uruchomienie skompilowanego serwera produkcyjnego
```

---

## 🐳 Wdrożenie Kontenerowe (Docker & Coolify)

Aplikacja posiada gotowy, wieloetapowy plik `Dockerfile` zoptymalizowany pod minimalny rozmiar obrazu produkcyjnego.

### Uruchomienie przez Docker
```bash
# Zbudowanie obrazu
docker build -t jzd:latest .

# Uruchomienie kontenera
docker run -d -p 3001:3001 --name jzd jzd:latest
```
Aplikacja uruchomi się na porcie `3001` serwując zarówno API, WebSockets, jak i skompilowany interfejs graficzny.

### Wdrożenie w Coolify (1-Click Deploy)
1. W panelu Coolify wybierz **+ New Resource** $\rightarrow$ **Public/Private Repository**.
2. Wskaż adres repozytorium: `git@github.com:ManveruPL/JZD.git` (gałąź `master`).
3. Wybierz Build Pack: **Dockerfile**.
4. Ustaw port wewnętrzny: `3001`.
5. Wpisz swoją domenę z HTTPS (np. `https://jzd.twojadomena.pl`).
6. Ustaw ścieżkę Healthcheck: `/health`.
7. Kliknij **Deploy**.

---

## 📄 Licencja

Projekt udostępniany na licencji MIT.
Dedykowany fanom teleturnieju *Jeden z dziesięciu* oraz wszystkim miłośnikom dobrej wiedzy i rywalizacji fair-play.
