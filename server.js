// QUIZ ARENA - WebSocket Server
// Avvio: node server.js
// Richiede: npm install ws

const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// ─── HTTP server per servire il frontend ───────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ─── WebSocket server ──────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server: httpServer });

// Stato globale
const waitingPlayers = {}; // category -> [player]
const rooms = {};          // roomId -> Room

function uid() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ─── Domande fallback per categoria ───────────────────────────────────────
const questionDB = {
  'Storia': [
    { q: 'In quale anno cadde il Muro di Berlino?', opts: ['1987', '1989', '1991', '1993'], a: 1 },
    { q: 'Chi fu il primo Presidente degli Stati Uniti?', opts: ['Lincoln', 'Jefferson', 'Washington', 'Adams'], a: 2 },
    { q: 'In quale anno iniziò la Prima Guerra Mondiale?', opts: ['1912', '1914', '1916', '1918'], a: 1 },
    { q: 'Quale civiltà costruì il Colosseo?', opts: ['Greca', 'Egizia', 'Romana', 'Cartaginese'], a: 2 },
    { q: 'In quale città fu assassinato Giulio Cesare?', opts: ['Roma', 'Atene', 'Cartagine', 'Alessandria'], a: 0 },
    { q: 'Quale impero fu il più grande della storia?', opts: ['Romano', 'Mongolo', 'Britannico', 'Ottomano'], a: 1 },
    { q: 'Chi dipinse la Cappella Sistina?', opts: ['Da Vinci', 'Raffaello', 'Michelangelo', 'Botticelli'], a: 2 },
    { q: 'In quale anno Colombo arrivò in America?', opts: ['1488', '1490', '1492', '1494'], a: 2 },
    { q: 'Chi fu il primo uomo a circumnavigare il globo?', opts: ['Colombo', 'Vespucci', 'Magellano', 'Da Gama'], a: 2 },
    { q: 'Quale paese era l\'URSS?', opts: ['Russia', 'Ucraina', 'Unione Sovietica', 'Polonia'], a: 2 },
  ],
  'Scienza': [
    { q: 'Qual è il simbolo chimico dell\'oro?', opts: ['Go', 'Au', 'Ag', 'Or'], a: 1 },
    { q: 'Quanti pianeti ci sono nel Sistema Solare?', opts: ['7', '8', '9', '10'], a: 1 },
    { q: 'Chi formulò la teoria della relatività?', opts: ['Newton', 'Bohr', 'Einstein', 'Planck'], a: 2 },
    { q: 'Qual è la formula chimica dell\'acqua?', opts: ['HO', 'H2O', 'H3O', 'OH2'], a: 1 },
    { q: 'Quanti cromosomi ha l\'essere umano?', opts: ['23', '44', '46', '48'], a: 2 },
    { q: 'Chi scoprì la penicillina?', opts: ['Pasteur', 'Curie', 'Fleming', 'Koch'], a: 2 },
    { q: 'Qual è il gas più abbondante nell\'atmosfera terrestre?', opts: ['Ossigeno', 'CO2', 'Azoto', 'Argon'], a: 2 },
    { q: 'Quale organo produce l\'insulina?', opts: ['Fegato', 'Reni', 'Pancreas', 'Milza'], a: 2 },
    { q: 'Qual è la velocità della luce (approssimativa)?', opts: ['200.000 km/s', '300.000 km/s', '400.000 km/s', '150.000 km/s'], a: 1 },
    { q: 'Qual è l\'elemento più abbondante nell\'universo?', opts: ['Ossigeno', 'Elio', 'Idrogeno', 'Carbonio'], a: 2 },
  ],
  'Sport': [
    { q: 'In quale sport si usa il termine "slam dunk"?', opts: ['Pallavolo', 'Tennis', 'Basket', 'Rugby'], a: 2 },
    { q: 'In quale paese nacque il calcio moderno?', opts: ['Italia', 'Spagna', 'Inghilterra', 'Brasile'], a: 2 },
    { q: 'Quale squadra ha vinto più Champions League?', opts: ['Barcellona', 'Bayern', 'Real Madrid', 'Juventus'], a: 2 },
    { q: 'In quale sport si compete per la Coppa Davis?', opts: ['Golf', 'Tennis', 'Nuoto', 'Ciclismo'], a: 1 },
    { q: 'Qual è la distanza di una maratona?', opts: ['36 km', '40 km', '42,195 km', '45 km'], a: 2 },
    { q: 'Chi detiene il record mondiale nei 100m maschili?', opts: ['Bolt', 'Powell', 'Gay', 'Coleman'], a: 0 },
    { q: 'Quanti giocatori ci sono in una squadra di basket?', opts: ['4', '5', '6', '7'], a: 1 },
    { q: 'In quale sport si usa il termine "birdie"?', opts: ['Baseball', 'Cricket', 'Golf', 'Badminton'], a: 2 },
    { q: 'Quante medaglie d\'oro ha vinto Michael Phelps alle Olimpiadi?', opts: ['18', '20', '23', '25'], a: 2 },
    { q: 'In quale anno si tennero le prime Olimpiadi moderne?', opts: ['1892', '1896', '1900', '1904'], a: 1 },
  ],
  'Arte & Cinema': [
    { q: 'Chi diresse "Schindler\'s List"?', opts: ['Kubrick', 'Spielberg', 'Scorsese', 'Coppola'], a: 1 },
    { q: 'Chi dipinse "La notte stellata"?', opts: ['Monet', 'Picasso', 'Van Gogh', 'Dalì'], a: 2 },
    { q: 'Chi dipinse la Gioconda?', opts: ['Raffaello', 'Michelangelo', 'Da Vinci', 'Botticelli'], a: 2 },
    { q: 'In quale museo si trova la Gioconda?', opts: ['Prado', 'Uffizi', 'Louvre', 'MoMA'], a: 2 },
    { q: 'Chi diresse "2001: Odissea nello Spazio"?', opts: ['Kubrick', 'Ridley Scott', 'Lynch', 'Spielberg'], a: 0 },
    { q: 'Quale periodo artistico è associato a Picasso?', opts: ['Impressionismo', 'Cubismo', 'Surrealismo', 'Dadaismo'], a: 1 },
    { q: 'Chi scrisse la "Divina Commedia"?', opts: ['Petrarca', 'Boccaccio', 'Ariosto', 'Dante'], a: 3 },
    { q: 'Chi compose la "Quinta Sinfonia"?', opts: ['Mozart', 'Bach', 'Beethoven', 'Chopin'], a: 2 },
    { q: 'Quale film ha vinto più Oscar (11)?', opts: ['Titanic', 'Ben-Hur', 'LOTR: Return', 'Tutti e tre'], a: 3 },
    { q: 'Chi scrisse "Romeo e Giulietta"?', opts: ['Dickens', 'Chaucer', 'Shakespeare', 'Byron'], a: 2 },
  ],
  'Tecnologia': [
    { q: 'Quando è stato fondato Google?', opts: ['1996', '1998', '2000', '2002'], a: 1 },
    { q: 'Cosa sta per "CPU"?', opts: ['Central Processing Unit', 'Core Power Unit', 'Computer Processing Unit', 'Control Power Unit'], a: 0 },
    { q: 'Chi ha creato Linux?', opts: ['Gates', 'Jobs', 'Torvalds', 'Zuckerberg'], a: 2 },
    { q: 'Quanti bit ha un byte?', opts: ['4', '6', '8', '16'], a: 2 },
    { q: 'Cosa significa "HTML"?', opts: ['HyperText Markup Language', 'High Text Machine Language', 'HyperText Machine Learning', 'High Transfer Markup Language'], a: 0 },
    { q: 'In quale anno fu lanciato il primo iPhone?', opts: ['2005', '2006', '2007', '2008'], a: 2 },
    { q: 'Quale azienda ha sviluppato il chip M1?', opts: ['Intel', 'AMD', 'Apple', 'Qualcomm'], a: 2 },
    { q: 'Cosa sta per "API"?', opts: ['Application Program Interface', 'Automated Programming Integration', 'Application Programming Interface', 'Advanced Protocol Interface'], a: 2 },
    { q: 'Chi ha fondato Microsoft?', opts: ['Jobs e Wozniak', 'Gates e Allen', 'Zuckerberg', 'Bezos'], a: 1 },
    { q: 'Quale linguaggio usa Python come paradigma principale?', opts: ['Funzionale', 'Logico', 'Orientato agli oggetti', 'Imperativo'], a: 2 },
  ],
  'Misto': []
};

// Costruisci Misto
const allQ = [];
['Storia','Scienza','Sport','Arte & Cinema','Tecnologia'].forEach(cat => {
  questionDB[cat].forEach(q => allQ.push({...q, cat}));
});
for (let i = allQ.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
}
questionDB['Misto'] = allQ.slice(0, 10);

function getQuestions(category) {
  const pool = [...(questionDB[category] || questionDB['Misto'])];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 10);
}

// ─── Classe Room ───────────────────────────────────────────────────────────
class Room {
  constructor(id, category) {
    this.id = id;
    this.category = category;
    this.players = []; // [{ws, name, playerId, score, answeredAt}]
    this.questions = getQuestions(category);
    this.currentQ = 0;
    this.questionStartTime = null;
    this.answersThisRound = 0;
    this.questionTimer = null;
    this.state = 'waiting'; // waiting | countdown | playing | finished
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    this.players.forEach(p => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(data);
      }
    });
  }

  sendTo(playerId, msg) {
    const p = this.players.find(x => x.playerId === playerId);
    if (p && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(JSON.stringify(msg));
    }
  }

  start() {
    this.state = 'countdown';
    const p0 = this.players[0];
    const p1 = this.players[1];

    // Informa entrambi del match
    this.sendTo(p0.playerId, {
      type: 'match_found',
      you: { name: p0.name, playerId: p0.playerId },
      opponent: { name: p1.name, playerId: p1.playerId }
    });
    this.sendTo(p1.playerId, {
      type: 'match_found',
      you: { name: p1.name, playerId: p1.playerId },
      opponent: { name: p0.name, playerId: p0.playerId }
    });

    // Countdown 3s poi avvia
    setTimeout(() => this.nextQuestion(), 4000);
  }

  nextQuestion() {
    if (this.currentQ >= this.questions.length) {
      this.endGame();
      return;
    }

    this.state = 'playing';
    this.answersThisRound = 0;
    this.questionStartTime = Date.now();

    const q = this.questions[this.currentQ];
    const payload = {
      type: 'question',
      questionIndex: this.currentQ,
      total: this.questions.length,
      question: q.q,
      options: q.opts,
      category: q.cat || this.category,
      timeLimit: 15
    };

    this.broadcast(payload);

    // Auto-advance dopo 16s
    this.questionTimer = setTimeout(() => {
      this.revealAndAdvance();
    }, 16000);
  }

  handleAnswer(playerId, answerIndex) {
    if (this.state !== 'playing') return;

    const player = this.players.find(p => p.playerId === playerId);
    if (!player || player.answeredThisRound) return;

    const elapsed = (Date.now() - this.questionStartTime) / 1000;
    const q = this.questions[this.currentQ];
    const correct = answerIndex === q.a;
    const timeBonus = Math.max(0, 15 - elapsed);
    const pts = correct ? Math.round(100 + timeBonus * 20) : 0;

    player.answeredThisRound = true;
    player.score += pts;
    this.answersThisRound++;

    // Notifica il giocatore del suo risultato
    this.sendTo(playerId, {
      type: 'answer_result',
      correct,
      correctIndex: q.a,
      points: pts,
      yourScore: player.score
    });

    // Notifica l'avversario che ha risposto (senza rivelare la risposta)
    const opponent = this.players.find(p => p.playerId !== playerId);
    if (opponent) {
      this.sendTo(opponent.playerId, {
        type: 'opponent_answered',
        opponentScore: player.score
      });
    }

    // Se entrambi hanno risposto, avanza subito
    if (this.answersThisRound >= 2) {
      clearTimeout(this.questionTimer);
      setTimeout(() => this.revealAndAdvance(), 1500);
    }
  }

  revealAndAdvance() {
    // Reset flag risposta per round successivo
    this.players.forEach(p => p.answeredThisRound = false);
    this.currentQ++;
    
    setTimeout(() => this.nextQuestion(), 500);
  }

  endGame() {
    this.state = 'finished';
    clearTimeout(this.questionTimer);

    const [p0, p1] = this.players;
    const scores = {
      [p0.playerId]: p0.score,
      [p1.playerId]: p1.score
    };

    this.players.forEach(p => {
      const opponent = this.players.find(x => x.playerId !== p.playerId);
      const won = p.score > opponent.score;
      const draw = p.score === opponent.score;

      p.ws.send(JSON.stringify({
        type: 'game_over',
        yourScore: p.score,
        opponentScore: opponent.score,
        result: draw ? 'draw' : won ? 'win' : 'lose',
        opponentName: opponent.name
      }));
    });

    // Pulisci la stanza dopo 30s
    setTimeout(() => { delete rooms[this.id]; }, 30000);
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.playerId === playerId);
    if (idx !== -1) this.players.splice(idx, 1);

    if (this.state === 'playing' || this.state === 'countdown') {
      // Avvisa l'avversario rimasto
      this.broadcast({ type: 'opponent_disconnected' });
      clearTimeout(this.questionTimer);
      this.state = 'finished';
    }

    if (this.players.length === 0) {
      delete rooms[this.id];
    }
  }
}

// ─── Matchmaking ───────────────────────────────────────────────────────────
function tryMatchmaking(category, newPlayer) {
  if (!waitingPlayers[category]) waitingPlayers[category] = [];
  
  const waiting = waitingPlayers[category];
  
  // Cerca un giocatore in attesa (con WS ancora aperta)
  const idx = waiting.findIndex(p => p.ws.readyState === WebSocket.OPEN);
  
  if (idx !== -1) {
    const opponent = waiting.splice(idx, 1)[0];
    
    // Crea stanza
    const roomId = uid();
    const room = new Room(roomId, category);
    room.players.push(opponent, newPlayer);
    opponent.room = room;
    newPlayer.room = room;
    rooms[roomId] = room;
    
    room.start();
  } else {
    // Metti in attesa
    waiting.push(newPlayer);
    newPlayer.ws.send(JSON.stringify({ type: 'searching' }));
    
    // Timeout 120s se non trova nessuno
    newPlayer.searchTimeout = setTimeout(() => {
      const i = waiting.indexOf(newPlayer);
      if (i !== -1) waiting.splice(i, 1);
      if (newPlayer.ws.readyState === WebSocket.OPEN) {
        newPlayer.ws.send(JSON.stringify({ type: 'search_timeout' }));
      }
    }, 120000);
  }
}

// ─── Connessioni WebSocket ─────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const playerId = uid();
  const player = { ws, playerId, name: 'Anonymous', score: 0, room: null };

  console.log(`[+] Connesso: ${playerId} (totale: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'join': {
        player.name = (msg.name || 'Anonymous').slice(0, 20);
        const category = msg.category || 'Misto';
        clearTimeout(player.searchTimeout);
        tryMatchmaking(category, player);
        break;
      }

      case 'answer': {
        if (player.room) {
          player.room.handleAnswer(playerId, msg.answerIndex);
        }
        break;
      }

      case 'cancel_search': {
        // Rimuovi dalla waiting list
        Object.values(waitingPlayers).forEach(list => {
          const i = list.indexOf(player);
          if (i !== -1) list.splice(i, 1);
        });
        clearTimeout(player.searchTimeout);
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log(`[-] Disconnesso: ${playerId}`);
    clearTimeout(player.searchTimeout);
    
    // Rimuovi da waiting list
    Object.values(waitingPlayers).forEach(list => {
      const i = list.indexOf(player);
      if (i !== -1) list.splice(i, 1);
    });

    // Notifica room
    if (player.room) {
      player.room.removePlayer(playerId);
    }
  });

  ws.on('error', (err) => {
    console.error(`Errore WS ${playerId}:`, err.message);
  });

  // Invia l'ID al client
  ws.send(JSON.stringify({ type: 'connected', playerId }));
});

// ─── Avvio ─────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🎮 QUIZ ARENA server avviato!`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Apri in due browser diversi per testare il multiplayer\n`);
});
