# 🎮 QUIZ ARENA — Multiplayer Real-Time

App quiz multiplayer in tempo reale con WebSocket.

## Setup (2 minuti)

### 1. Requisiti
- **Node.js** installato → [nodejs.org](https://nodejs.org)

### 2. Installa le dipendenze
```bash
cd quiz-arena
npm install ws
```

### 3. Avvia il server
```bash
node server.js
```

Vedrai:
```
🎮 QUIZ ARENA server avviato!
   http://localhost:3000
```

### 4. Apri il gioco
Apri **due tab** (o due browser diversi) su `http://localhost:3000`

Entrambi selezionano la **stessa categoria**, inseriscono nickname e cliccano **"TROVA AVVERSARIO"** → il matchmaking li connette automaticamente!

---

## Come funziona

```
Player A                    Server                    Player B
   |                           |                           |
   |── join(Sport) ───────────>|                           |
   |                    in coda...                         |
   |                           |<──────── join(Sport) ─────|
   |<── match_found ───────────|─── match_found ──────────>|
   |                     countdown 3s                      |
   |<── question #1 ───────────|─── question #1 ──────────>|
   |── answer(2) ─────────────>|                           |
   |<── answer_result ─────────|                           |
   |                           |<──────── answer(1) ───────|
   |<── opponent_answered ─────|─── answer_result ────────>|
   |                    ... 10 domande ...                  |
   |<── game_over(win) ────────|─── game_over(lose) ───────|
```

### Matchmaking
- I giocatori vengono abbinati **per categoria**
- Se non si trova nessuno entro 2 minuti → timeout automatico
- Le stanze sono isolate: ogni coppia ha la propria partita

### Punteggio
- Risposta corretta: **100 punti base + bonus velocità** (fino a +300)
- Risposta sbagliata o timeout: **0 punti**
- Il vincitore è chi ha più punti dopo 10 domande

### Disconnessione
- Se un giocatore si disconnette durante la partita, l'avversario viene avvisato e torna al menu

---

## Struttura file
```
quiz-arena/
├── server.js    ← Backend Node.js + WebSocket
├── index.html   ← Frontend (servito automaticamente dal server)
├── package.json
└── README.md
```

## Play online (opzionale)
Per giocare con persone fuori dalla rete locale, puoi deployare su:
- **Railway** → `railway up` (gratuito)
- **Render** → Aggiungi come Web Service
- **VPS** → `node server.js` + nginx reverse proxy

Cambia `WS_URL` in `index.html` con l'URL del tuo server deployed.
