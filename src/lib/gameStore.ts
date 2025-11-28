// src/lib/gameStore.ts
import { pool, initDb } from '@/lib/db';

export type Role = 'civilian' | 'undercover' | 'mrwhite';

export type Player = {
  id: string;
  name: string;
  role?: Role;
  word?: string | null;
  isHost: boolean;
  isEliminated: boolean;
  lastSeen?: number; // 👈 add this
};


export type GameStatus = 'waiting' | 'started' | 'mrwhite_guess' | 'finished';

export type Winner = 'civilians' | 'undercovers' | 'mrwhite' | null;

export type LobbySettings = {
  civilians: number;
  undercovers: number;
  mrWhites: number;
};

export type Lobby = {
  code: string;
  hostId: string;
  hostSecret: string;
  players: Player[];
  settings: LobbySettings;
  status: GameStatus;
  civilianWord?: string;
  undercoverWord?: string;
  winner: Winner;
  pendingMrWhiteId?: string | null;
  usedWordIndices: number[];
};

const LOBBY_TABLE = 'lobbies';

// ---------- helpers ----------

function pruneInactivePlayers(lobby: Lobby): Lobby {
  // Only auto-clean while waiting in lobby
  if (lobby.status !== 'waiting') return lobby;

  const now = Date.now();
  const TIMEOUT_MS = 60_000; // 1 minute without heartbeat = gone

  const before = lobby.players.length;
  lobby.players = lobby.players.filter((p) => {
    if (!p.lastSeen) return true; // old data with no heartbeat yet -> keep
    return now - p.lastSeen < TIMEOUT_MS;
  });

  if (lobby.players.length !== before) {
    console.log(
      '[LOBBY] Pruned inactive players in',
      lobby.code,
      'before=',
      before,
      'after=',
      lobby.players.length
    );
  }

  return lobby;
}


function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateHostSecret(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// word pairs for civilian vs undercover
const WORD_PAIRS: Array<{ civilian: string; undercover: string }> = [
  { civilian: 'Cat', undercover: 'Dog' },
  { civilian: 'Beach', undercover: 'Pool' },
  { civilian: 'Pizza', undercover: 'Burger' },
  { civilian: 'Netflix', undercover: 'YouTube' },
  { civilian: 'Plane', undercover: 'Train' },
  { civilian: 'Apple', undercover: 'Banana' },
  { civilian: 'Bird', undercover: 'Airplane' },
];

async function loadLobby(code: string): Promise<Lobby | null> {
  await initDb();

  const res = await pool.query(
    `SELECT data FROM ${LOBBY_TABLE} WHERE code = $1`,
    [code.toUpperCase()]
  );

  if (res.rowCount === 0) {
    console.log('[DB] No lobby found for code', code);
    return null;
  }

  const lobby = res.rows[0].data as Lobby;
  pruneInactivePlayers(lobby);
  console.log(
    '[DB] Loaded lobby',
    lobby.code,
    'usedWordIndices=',
    lobby.usedWordIndices
  );
  return lobby;

}


async function saveLobby(lobby: Lobby): Promise<void> {
  await initDb();

  console.log(
    '[DB] Saving lobby',
    lobby.code,
    'status=',
    lobby.status,
    'usedWordIndices=',
    lobby.usedWordIndices
  );

  await pool.query(
    `INSERT INTO ${LOBBY_TABLE} (code, data)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (code) DO UPDATE SET data = EXCLUDED.data`,
    [lobby.code.toUpperCase(), JSON.stringify(lobby)]
  );
}


async function generateUniqueLobbyCode(): Promise<string> {
  await initDb();

  for (let i = 0; i < 50; i++) {
    const code = generateCode();
    const res = await pool.query(
      `SELECT 1 FROM ${LOBBY_TABLE} WHERE code = $1`,
      [code.toUpperCase()]
    );
    if (res.rowCount === 0) return code;
  }
  return generateCode();
}

function checkWinCondition(lobby: Lobby): Lobby {
  if (lobby.status === 'waiting' || lobby.status === 'finished') {
    return lobby;
  }

  const alive = lobby.players.filter((p) => !p.isEliminated);

  const anyUnderOrMr = alive.some(
    (p) => p.role === 'undercover' || p.role === 'mrwhite'
  );
  const anyCivilians = alive.some((p) => p.role === 'civilian');

  if (!anyUnderOrMr && anyCivilians) {
    lobby.status = 'finished';
    lobby.winner = 'civilians';
  } else if (!anyCivilians && anyUnderOrMr) {
    lobby.status = 'finished';
    lobby.winner = 'undercovers';
  } else if (!anyCivilians && !anyUnderOrMr) {
    lobby.status = 'finished';
    lobby.winner = null;
  }

  return lobby;
}

// ---------- exported functions used by API routes ----------

export async function getLobby(code: string): Promise<Lobby | null> {
  if (!code) return null;
  return loadLobby(code);
}

export async function createLobby(
  hostName: string,
  settings: LobbySettings
): Promise<{ lobby: Lobby; player: Player; hostSecret: string }> {
  const code = await generateUniqueLobbyCode();
  const hostSecret = generateHostSecret();

  const host: Player = {
    id: generateId(),
    name: hostName,
    isHost: true,
    isEliminated: false,
    lastSeen: Date.now(), // 👈 heartbeat for host
  };

  const lobby: Lobby = {
    code,
    hostId: host.id,
    hostSecret,
    players: [host],
    settings,
    status: 'waiting',
    winner: null,
    pendingMrWhiteId: null,
    usedWordIndices: [],
  };

  await saveLobby(lobby);

  return { lobby, player: host, hostSecret };
}


export async function joinLobby(
  code: string,
  playerName: string,
  hostCode?: string
): Promise<{ lobby: Lobby; player: Player } | null> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;
  if (lobby.status !== 'waiting') return null;

  const isHost = !!hostCode && hostCode === lobby.hostSecret;

  const player: Player = {
    id: generateId(),
    name: playerName,
    isHost,
    isEliminated: false,
    lastSeen: Date.now(), // 👈 heartbeat for this player
  };

  lobby.players.push(player);

  if (isHost) {
    lobby.hostId = player.id;
  }

  await saveLobby(lobby);
  return { lobby, player };
}


export async function startGame(code: string): Promise<Lobby | null> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;
  if (lobby.status !== 'waiting') return lobby;

  const totalRoles =
    lobby.settings.civilians +
    lobby.settings.undercovers +
    lobby.settings.mrWhites;

  if (totalRoles !== lobby.players.length) {
    throw new Error(
      `Player count (${lobby.players.length}) must equal total roles (${totalRoles}).`
    );
  }

  const availableIndices = WORD_PAIRS.map((_, i) => i).filter(
    (i) => !lobby.usedWordIndices.includes(i)
  );

  if (availableIndices.length === 0) {
    throw new Error(
      'This lobby has used all available word pairs. Please add more pairs in the code.'
    );
  }

 const chosenIndex =
  availableIndices[Math.floor(Math.random() * availableIndices.length)];
const pair = WORD_PAIRS[chosenIndex];

console.log(
  '[GAME] Starting new round in lobby',
  code,
  'chosenIndex=',
  chosenIndex,
  'pair=',
  pair,
  'previous usedWordIndices=',
  lobby.usedWordIndices
);

lobby.usedWordIndices.push(chosenIndex);


  const roles: Role[] = [
    ...Array(lobby.settings.civilians).fill('civilian' as Role),
    ...Array(lobby.settings.undercovers).fill('undercover' as Role),
    ...Array(lobby.settings.mrWhites).fill('mrwhite' as Role),
  ];

  // Shuffle roles (Fisher–Yates)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  lobby.players = lobby.players.map((p, idx) => {
    const role = roles[idx];
    let word: string | null = null;
    if (role === 'civilian') word = pair.civilian;
    if (role === 'undercover') word = pair.undercover;
    if (role === 'mrwhite') word = null;

    return {
      ...p,
      role,
      word,
      isEliminated: false,
    };
  });

  lobby.status = 'started';
  lobby.civilianWord = pair.civilian;
  lobby.undercoverWord = pair.undercover;
  lobby.winner = null;
  lobby.pendingMrWhiteId = null;

  await saveLobby(lobby);
  return lobby;
}

export async function eliminatePlayer(
  code: string,
  targetPlayerId: string
): Promise<
  { lobby: Lobby; player: Player; mrWhiteNeedsGuess: boolean } | null
> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;
  if (lobby.status === 'waiting' || lobby.status === 'finished') {
    return null;
  }

  const player = lobby.players.find((p) => p.id === targetPlayerId);
  if (!player || player.isEliminated) return null;

  player.isEliminated = true;

  let mrWhiteNeedsGuess = false;

  if (player.role === 'mrwhite' && lobby.status === 'started') {
    lobby.status = 'mrwhite_guess';
    lobby.pendingMrWhiteId = player.id;
    mrWhiteNeedsGuess = true;
  } else {
    checkWinCondition(lobby);
  }

  await saveLobby(lobby);
  return { lobby, player, mrWhiteNeedsGuess };
}

export async function kickFromLobby(
  code: string,
  hostId: string,
  targetPlayerId: string
): Promise<Lobby | null> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;

  // Only host can do this
  if (lobby.hostId !== hostId) return null;
  // Only in waiting stage (lobby state)
  if (lobby.status !== 'waiting') return null;

  const before = lobby.players.length;
  lobby.players = lobby.players.filter((p) => p.id !== targetPlayerId);

  if (lobby.players.length === before) {
    return null; // nothing removed
  }

  console.log(
    '[LOBBY] Host kicked player from lobby',
    lobby.code,
    'target=',
    targetPlayerId
  );

  await saveLobby(lobby);
  return lobby;
}


export async function submitMrWhiteGuess(
  code: string,
  playerId: string,
  guess: string
): Promise<{ lobby: Lobby; correct: boolean } | null> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;

  if (
    lobby.status !== 'mrwhite_guess' ||
    lobby.pendingMrWhiteId !== playerId
  ) {
    return null;
  }

  const target = lobby.civilianWord ?? '';
  const correct =
    target.trim().toLowerCase() === guess.trim().toLowerCase();

  if (correct) {
    lobby.status = 'finished';
    lobby.winner = 'mrwhite';
  } else {
    lobby.status = 'started';
    lobby.pendingMrWhiteId = null;
    checkWinCondition(lobby);
  }

  await saveLobby(lobby);
  return { lobby, correct };
}

export async function resetLobby(
  code: string,
  hostId: string
): Promise<Lobby | null> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;
  if (lobby.hostId !== hostId) return null;

  // Go back to pre-game state but keep all players in the lobby
  lobby.status = 'waiting';
  lobby.winner = null;
  lobby.pendingMrWhiteId = null;
  lobby.civilianWord = undefined;
  lobby.undercoverWord = undefined;

  // ✅ Keep usedWordIndices so this lobby never repeats word pairs
  // ✅ Keep all players, just clear their game state
  lobby.players = lobby.players.map((p) => ({
    ...p,
    role: undefined,
    word: undefined,
    isEliminated: false,
  }));

  await saveLobby(lobby);
  return lobby;
}


export async function updateLobbySettings(
  code: string,
  hostId: string,
  settings: LobbySettings
): Promise<Lobby | null> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;
  if (lobby.hostId !== hostId) return null;
  if (lobby.status !== 'waiting') return null;

  lobby.settings = settings;
  await saveLobby(lobby);
  return lobby;
}

export async function getPlayerState(
  code: string,
  playerId: string
): Promise<{ lobby: Lobby; player: Player } | null> {
  const lobby = await loadLobby(code);
  if (!lobby) return null;
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) return null;

  // 👇 heartbeat: they’re clearly still online
  player.lastSeen = Date.now();
  await saveLobby(lobby);

  return { lobby, player };
}


