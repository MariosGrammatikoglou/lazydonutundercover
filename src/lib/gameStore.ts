// src/lib/gameStore.ts
export type Role = 'civilian' | 'undercover' | 'mrwhite';

export type Player = {
  id: string;
  name: string;
  role?: Role;
  word?: string | null;
  isHost: boolean;
  isEliminated: boolean;
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
  hostId: string;          // current host player id
  hostSecret: string;      // permanent host code (what you give the host)
  players: Player[];
  settings: LobbySettings;
  status: GameStatus;
  civilianWord?: string;
  undercoverWord?: string;
  winner: Winner;
  pendingMrWhiteId?: string | null;
  usedWordIndices: number[]; // word pairs used in this lobby
};

const lobbies = new Map<string, Lobby>();

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

// host code like "4832"
function generateHostSecret(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Example word pairs (civilian vs undercover)
// You can add many more later.
const WORD_PAIRS: Array<{ civilian: string; undercover: string }> = [
  { civilian: 'Cat', undercover: 'Dog' },
  { civilian: 'Beach', undercover: 'Pool' },
  { civilian: 'Pizza', undercover: 'Burger' },
  { civilian: 'Netflix', undercover: 'YouTube' },
  { civilian: 'Plane', undercover: 'Train' },
  { civilian: 'Apple', undercover: 'Banana' },
  { civilian: 'Bird', undercover: 'Airplane' },
];

export function createLobby(
  hostName: string,
  settings: LobbySettings
): { lobby: Lobby; player: Player; hostSecret: string } {
  let code: string;
  do {
    code = generateCode();
  } while (lobbies.has(code));

  const hostSecret = generateHostSecret();

  const host: Player = {
    id: generateId(),
    name: hostName,
    isHost: true,
    isEliminated: false,
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

  lobbies.set(code, lobby);

  return { lobby, player: host, hostSecret };
}

export function joinLobby(
  code: string,
  playerName: string,
  hostCode?: string
): { lobby: Lobby; player: Player } | null {
  const lobby = lobbies.get(code.toUpperCase());
  if (!lobby) return null;
  if (lobby.status !== 'waiting') return null;

  const isHost = !!hostCode && hostCode === lobby.hostSecret;

  const player: Player = {
    id: generateId(),
    name: playerName,
    isHost,
    isEliminated: false,
  };

  lobby.players.push(player);

  // If they joined with the correct host code, they become the host now
  if (isHost) {
    lobby.hostId = player.id;
  }

  return { lobby, player };
}

export function getLobby(code: string): Lobby | null {
  if (!code) return null;
  const lobby = lobbies.get(code.toUpperCase());
  return lobby ?? null;
}

export function startGame(code: string): Lobby | null {
  const lobby = lobbies.get(code.toUpperCase());
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

  // pick a word pair this lobby has never used
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
  lobby.usedWordIndices.push(chosenIndex);

  const roles: Role[] = [
    ...Array(lobby.settings.civilians).fill('civilian' as Role),
    ...Array(lobby.settings.undercovers).fill('undercover' as Role),
    ...Array(lobby.settings.mrWhites).fill('mrwhite' as Role),
  ];

  // Shuffle roles
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

  return lobby;
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

export function eliminatePlayer(
  code: string,
  targetPlayerId: string
):
  | { lobby: Lobby; player: Player; mrWhiteNeedsGuess: boolean }
  | null {
  const lobby = lobbies.get(code.toUpperCase());
  if (!lobby) return null;
  if (lobby.status === 'waiting' || lobby.status === 'finished') {
    return null;
  }

  const player = lobby.players.find((p) => p.id === targetPlayerId);
  if (!player || player.isEliminated) return null;

  player.isEliminated = true;

  if (player.role === 'mrwhite' && lobby.status === 'started') {
    lobby.status = 'mrwhite_guess';
    lobby.pendingMrWhiteId = player.id;
    return { lobby, player, mrWhiteNeedsGuess: true };
  }

  checkWinCondition(lobby);
  return { lobby, player, mrWhiteNeedsGuess: false };
}

export function submitMrWhiteGuess(
  code: string,
  playerId: string,
  guess: string
): { lobby: Lobby; correct: boolean } | null {
  const lobby = lobbies.get(code.toUpperCase());
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

  return { lobby, correct };
}

export function resetLobby(
  code: string,
  hostId: string
): Lobby | null {
  const lobby = lobbies.get(code.toUpperCase());
  if (!lobby) return null;
  if (lobby.hostId !== hostId) return null;

  lobby.status = 'waiting';
  lobby.winner = null;
  lobby.pendingMrWhiteId = null;
  lobby.civilianWord = undefined;
  lobby.undercoverWord = undefined;

  // Important: DO NOT reset usedWordIndices here
  // so this lobby never gets the same word pairs again.

  lobby.players = lobby.players.map((p) => ({
    ...p,
    role: undefined,
    word: undefined,
    isEliminated: false,
  }));

  return lobby;
}

export function updateLobbySettings(
  code: string,
  hostId: string,
  settings: LobbySettings
): Lobby | null {
  const lobby = lobbies.get(code.toUpperCase());
  if (!lobby) return null;
  if (lobby.hostId !== hostId) return null;
  if (lobby.status !== 'waiting') return null;

  lobby.settings = settings;
  return lobby;
}

export function getPlayerState(code: string, playerId: string) {
  const lobby = lobbies.get(code.toUpperCase());
  if (!lobby) return null;
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) return null;
  return { lobby, player };
}
