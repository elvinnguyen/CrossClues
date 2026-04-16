const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E'];
const ROW_LABELS = ['1', '2', '3', '4', '5'];

const COLUMN_CATEGORIES = ['Animal', 'Color', 'Country', 'Sport', 'Food'];
const ROW_CATEGORIES = ['Hot', 'Fast', 'Big', 'Old', 'Soft'];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

export function createRoom(roomId) {
  return {
    roomId,
    players: [],
    turnIndex: 0,
    grid: buildGrid(),
    columnCategories: COLUMN_CATEGORIES,
    rowCategories: ROW_CATEGORIES,
    columnLabels: COLUMN_LABELS,
    rowLabels: ROW_LABELS,
    deck: buildDeck(),
    discardPile: [],
    usedClues: [],
    currentCard: null,
    phase: 'lobby', // lobby | clue | guess | ended
    revealedCount: 0,
  };
}

export function getActivePlayer(room) {
  return room.players[room.turnIndex];
}

export function drawCard(room) {
  if (room.deck.length === 0) return null;
  const card = room.deck.pop();
  room.currentCard = card;
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
  room.phase = 'guess';
  return { ok: true, clue: normalized };
}

export function resolveGuess(room, guessCell) {
  const correct = guessCell === room.currentCard;
  if (correct) {
    room.grid[room.currentCard].revealed = true;
    room.revealedCount++;
  } else {
    room.discardPile.push(room.currentCard);
  }
  room.currentCard = null;
  return correct;
}

export function advanceTurn(room) {
  room.turnIndex = (room.turnIndex + 1) % room.players.length;
  if (room.deck.length === 0) {
    room.phase = 'ended';
    return true;
  }
  room.phase = 'clue';
  return false;
}

export function getPublicState(room, includeCard = false) {
  return {
    roomId: room.roomId,
    players: room.players.map((p) => p.name),
    turnIndex: room.turnIndex,
    activePlayer: getActivePlayer(room)?.name ?? null,
    grid: room.grid,
    columnCategories: room.columnCategories,
    rowCategories: room.rowCategories,
    columnLabels: room.columnLabels,
    rowLabels: room.rowLabels,
    deckCount: room.deck.length,
    discardCount: room.discardPile.length,
    usedClues: room.usedClues,
    currentCard: includeCard ? room.currentCard : null,
    phase: room.phase,
    revealedCount: room.revealedCount,
  };
}
