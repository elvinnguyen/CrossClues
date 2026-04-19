const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E'];
const ROW_LABELS = ['1', '2', '3', '4', '5'];

const CATEGORY_POOL_A = [
  'Animal', 'Color', 'Country', 'Sport', 'Food',
  'Movie', 'Music', 'Weather', 'Clothing', 'Vehicle',
  'Fruit', 'Drink', 'Tool', 'Planet', 'Language',
];

const CATEGORY_POOL_B = [
  'Hot', 'Fast', 'Big', 'Old', 'Soft',
  'Loud', 'Heavy', 'Sharp', 'Sweet', 'Dark',
  'Round', 'Wet', 'Cold', 'Tiny', 'Strong',
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(pool, count) {
  return shuffle(pool).slice(0, count);
}

function buildDeck() {
  const cards = [];
  for (const col of COLUMN_LABELS) {
    for (const row of ROW_LABELS) {
      cards.push(col + row);
    }
  }
  return shuffle(cards);
}

function buildGrid() {
  const grid = {};
  for (const col of COLUMN_LABELS) {
    for (const row of ROW_LABELS) {
      grid[col + row] = { revealed: false };
    }
  }
  return grid;
}

export function createRoom(roomId, hostId) {
  return {
    roomId,
    hostId,
    players: [],
    turnIndex: 0,
    grid: buildGrid(),
    columnCategories: [],
    rowCategories: [],
    columnLabels: COLUMN_LABELS,
    rowLabels: ROW_LABELS,
    deck: [],
    discardPile: [],
    usedClues: [],
    currentCard: null,
    currentClue: null,
    phase: 'lobby',
    revealedCount: 0,
    selections: {},
    votes: {},
    chatMessages: [],
    lastGuessResult: null,
  };
}

export function initializeGame(room) {
  room.columnCategories = pickRandom(CATEGORY_POOL_A, 5);
  room.rowCategories = pickRandom(CATEGORY_POOL_B, 5);
  room.deck = buildDeck();
  room.grid = buildGrid();
  room.discardPile = [];
  room.usedClues = [];
  room.currentCard = null;
  room.currentClue = null;
  room.turnIndex = 0;
  room.revealedCount = 0;
  room.selections = {};
  room.votes = {};
  room.lastGuessResult = null;
}

export function getActivePlayer(room) {
  return room.players[room.turnIndex];
}

export function drawCard(room) {
  if (room.deck.length === 0) return null;
  const card = room.deck.pop();
  room.currentCard = card;
  room.currentClue = null;
  room.selections = {};
  room.votes = {};
  room.phase = 'clue';
  return card;
}

export function submitClue(room, clue) {
  const normalized = clue.trim().toLowerCase();
  if (room.usedClues.includes(normalized)) {
    return { ok: false, reason: 'Clue already used' };
  }
  if (normalized.includes(' ')) {
    return { ok: false, reason: 'Clue must be one word' };
  }
  if (normalized.length === 0) {
    return { ok: false, reason: 'Clue cannot be empty' };
  }
  room.usedClues.push(normalized);
  room.currentClue = normalized;
  room.selections = {};
  room.votes = {};
  room.phase = 'guess';
  return { ok: true, clue: normalized };
}

export function selectCell(room, playerId, cell) {
  room.selections[playerId] = cell;
}

export function submitVote(room, playerId, cell) {
  room.votes[playerId] = cell;
  delete room.selections[playerId];
}

export function allVotesIn(room) {
  const active = getActivePlayer(room);
  const voters = room.players.filter((p) => p.id !== active.id);
  if (voters.length === 0) return false;
  return voters.every((p) => room.votes[p.id] !== undefined);
}

export function tallyVotes(room) {
  const counts = {};
  for (const cell of Object.values(room.votes)) {
    counts[cell] = (counts[cell] || 0) + 1;
  }
  let maxCell = null;
  let maxCount = 0;
  for (const [cell, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCell = cell;
    }
  }
  return maxCell;
}

export function resolveGuess(room, guessCell) {
  const correct = guessCell === room.currentCard;
  if (correct) {
    room.grid[room.currentCard].revealed = true;
    room.revealedCount++;
  } else {
    room.discardPile.push(room.currentCard);
  }
  room.lastGuessResult = { cell: guessCell, correct };
  room.currentCard = null;
  room.selections = {};
  room.votes = {};
  return correct;
}

export function advanceTurn(room) {
  room.turnIndex = (room.turnIndex + 1) % room.players.length;
  if (room.deck.length === 0) {
    room.phase = 'ended';
    return true;
  }
  return false;
}

export function getPublicState(room, includeCard = false) {
  const active = getActivePlayer(room);
  const voterCount = room.players.length > 0 ? room.players.length - 1 : 0;
  const votedCount = Object.keys(room.votes).length;

  const playerNameById = {};
  for (const p of room.players) playerNameById[p.id] = p.name;

  const selections = {};
  for (const [id, cell] of Object.entries(room.selections)) {
    selections[id] = { name: playerNameById[id], cell };
  }

  const playerVotes = Object.entries(room.votes).map(([id, cell]) => ({
    id,
    name: playerNameById[id],
    cell,
  }));

  return {
    roomId: room.roomId,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady,
    })),
    turnIndex: room.turnIndex,
    activePlayer: active?.name ?? null,
    activePlayerId: active?.id ?? null,
    grid: room.grid,
    columnCategories: room.columnCategories,
    rowCategories: room.rowCategories,
    columnLabels: room.columnLabels,
    rowLabels: room.rowLabels,
    deckCount: room.deck.length,
    discardCount: room.discardPile.length,
    usedClues: room.usedClues,
    currentCard: includeCard ? room.currentCard : null,
    currentClue: room.currentClue,
    phase: room.phase,
    revealedCount: room.revealedCount,
    votedCount,
    voterCount,
    selections,
    playerVotes,
    lastGuessResult: room.lastGuessResult,
    chatMessages: room.chatMessages.slice(-50),
  };
}
