// src/app/lobby/[code]/page.tsx
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type GameStatus = 'waiting' | 'started' | 'mrwhite_guess' | 'finished';

type Winner = 'civilians' | 'undercovers' | 'mrwhite' | null;

type LobbyPublic = {
  code: string;
  status: GameStatus;
  winner: Winner;
  settings: {
    civilians: number;
    undercovers: number;
    mrWhites: number;
  };
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isEliminated: boolean;
  }>;
};

type MyState =
  | {
      lobbyStatus: GameStatus;
      winner: Winner;
      player: {
        id: string;
        name: string;
        role?: 'civilian' | 'undercover' | 'mrwhite';
        word: string | null;
        isHost: boolean;
        isEliminated: boolean;
      };
    }
  | null;

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const playerId = searchParams.get('playerId');

  const [lobby, setLobby] = useState<LobbyPublic | null>(null);
  const [myState, setMyState] = useState<MyState>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);

  const [mrWhiteGuess, setMrWhiteGuess] = useState('');
  const [guessLoading, setGuessLoading] = useState(false);
  const [guessMessage, setGuessMessage] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);
const [resetError, setResetError] = useState<string | null>(null);

const [editCivilians, setEditCivilians] = useState<number | null>(null);
const [editUndercovers, setEditUndercovers] = useState<number | null>(null);
const [editMrWhites, setEditMrWhites] = useState<number | null>(null);
const [savingSettings, setSavingSettings] = useState(false);
const [settingsError, setSettingsError] = useState<string | null>(null);



  const code = params.code;

  // Poll lobby info
  useEffect(() => {
    let active = true;

    async function fetchLobby() {
      try {
        const res = await fetch(`/api/lobby/${code}`);
        if (!res.ok) {
          setError('Lobby not found');
          return;
        }
        const data = await res.json();
        if (!active) return;
        setLobby(data);
        if (active) {
  setLobby(data);
  // initialize edit fields if null
  if (editCivilians === null) setEditCivilians(data.settings.civilians);
  if (editUndercovers === null) setEditUndercovers(data.settings.undercovers);
  if (editMrWhites === null) setEditMrWhites(data.settings.mrWhites);
}

      } catch (e) {
        if (!active) return;
        setError('Network error');
      }
    }

    

    fetchLobby();
    const interval = setInterval(fetchLobby, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [code]);

  // Poll my state (role & word)
  useEffect(() => {
    if (!playerId) return;
    let active = true;

    async function fetchState() {
      try {
        const res = await fetch('/api/my-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lobbyCode: code, playerId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setMyState(data);
      } catch {
        // ignore
      }
    }

    fetchState();
    const interval = setInterval(fetchState, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [code, playerId]);

  if (!playerId) {
    return (
      <div className="card">
        <h2>Missing player</h2>
        <p>You must join via a proper link from the home screen.</p>
      </div>
    );
  }

  const isHost =
    myState?.player?.isHost ??
    lobby?.players.find((p) => p.id === playerId)?.isHost ??
    false;

  const totalRoles = lobby
    ? lobby.settings.civilians +
      lobby.settings.undercovers +
      lobby.settings.mrWhites
    : 0;

  async function handleStartGame() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not start game');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setStarting(false);
    }
  }

  async function handleSaveSettings() {
  if (!playerId || editCivilians === null || editUndercovers === null || editMrWhites === null) return;
  setSettingsError(null);
  setSavingSettings(true);
  try {
    const res = await fetch('/api/update-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lobbyCode: code,
        hostId: playerId,
        civilians: editCivilians,
        undercovers: editUndercovers,
        mrWhites: editMrWhites,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSettingsError(data.error ?? 'Could not update settings');
    }
  } catch {
    setSettingsError('Network error');
  } finally {
    setSavingSettings(false);
  }
}


  async function handleKick(targetId: string) {
    if (!playerId) return;
    setActionError(null);
    setKickingId(targetId);
    try {
      const res = await fetch('/api/kick-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyCode: code,
          hostId: playerId,
          targetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Could not kick player');
      }
    } catch {
      setActionError('Network error');
    } finally {
      setKickingId(null);
    }
  }

  async function handleResetLobby() {
  if (!playerId) return;
  setResetError(null);
  setResetting(true);
  try {
    const res = await fetch('/api/reset-lobby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lobbyCode: code,
        hostId: playerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error ?? 'Could not reset lobby');
    } else {
      // Optional: clear local “game over”/guess messages
      setGuessMessage(null);
      setMrWhiteGuess('');
    }
  } catch {
    setResetError('Network error');
  } finally {
    setResetting(false);
  }
}


  async function handleMrWhiteGuess() {
    if (!playerId || !mrWhiteGuess.trim()) return;
    setGuessLoading(true);
    setGuessMessage(null);
    try {
      const res = await fetch('/api/mrwhite-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyCode: code,
          playerId,
          guess: mrWhiteGuess,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuessMessage(data.error ?? 'Could not submit guess');
      } else {
        setGuessMessage(
          data.correct
            ? 'Correct! Mr. White wins!'
            : 'Wrong guess. The game continues (or may be over by roles).'
        );
      }
    } catch {
      setGuessMessage('Network error');
    } finally {
      setGuessLoading(false);
      setMrWhiteGuess('');
    }
  }

  const statusLabel =
    lobby?.status === 'waiting'
      ? 'Waiting for players'
      : lobby?.status === 'started'
      ? 'Game in progress'
      : lobby?.status === 'mrwhite_guess'
      ? 'Waiting for Mr. White to guess'
      : lobby?.status === 'finished'
      ? 'Game finished'
      : 'Unknown';

  const winnerText =
    lobby?.status === 'finished'
      ? lobby.winner === 'civilians'
        ? 'Civilians win! 🎉'
        : lobby.winner === 'undercovers'
        ? 'Undercovers win! 😈'
        : lobby.winner === 'mrwhite'
        ? 'Mr. White wins! 🕵️‍♂️'
        : 'Game over.'
      : null;

  return (
    <div className="card">
      <h2>Lobby: {code}</h2>

      {lobby ? (
        <>
          <p
            style={{
              marginTop: '0.25rem',
              fontSize: '0.85rem',
              color: '#9ca3af',
            }}
          >
            Status: <strong>{statusLabel}</strong>
          </p>

          {winnerText && (
            <p
              style={{
                marginTop: '0.25rem',
                fontSize: '0.95rem',
                color: '#fbbf24',
              }}
            >
              {winnerText}
            </p>
          )}

          {lobby.status === 'finished' && isHost && (
  <div style={{ marginTop: '0.75rem' }}>
    <button onClick={handleResetLobby} disabled={resetting}>
      {resetting ? 'Resetting lobby...' : 'Back to Lobby (reset game)'}
    </button>
  </div>
)}


          <p
            style={{
              marginTop: '0.25rem',
              fontSize: '0.85rem',
              color: '#9ca3af',
            }}
          >
            Roles: {lobby.settings.civilians} Civilians,{' '}
            {lobby.settings.undercovers} Undercovers,{' '}
            {lobby.settings.mrWhites} Mr. Whites (Total {totalRoles})
          </p>

          <div className="lobby-players">
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              Players in lobby ({lobby.players.length}/{totalRoles})
            </span>
            <ul>
              {lobby.players.map((p) => {
  const isMe = p.id === playerId;
  const canKickThisPlayer =
    isHost &&
    lobby.status === 'started' &&
    !p.isEliminated;

  return (
    <li
      key={p.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
      }}
    >
      <span>
        {p.name}
        {isMe && <span className="badge">You</span>}
        {p.isHost && <span className="badge">Host</span>}
        {p.isEliminated && (
          <span className="badge">Eliminated</span>
        )}
      </span>

      {canKickThisPlayer && (
        <button
          className="button-secondary"
          onClick={() => handleKick(p.id)}
          disabled={kickingId === p.id}
          style={{ paddingInline: '0.75rem' }}
        >
          {kickingId === p.id
            ? 'Kicking...'
            : isMe
            ? 'Eliminate yourself'
            : 'Kick'}
        </button>
      )}
    </li>
  );
})}

            </ul>
          </div>

        {lobby.status === 'waiting' && isHost && (
  <div style={{ marginTop: '1rem' }}>
    <p
      style={{
        fontSize: '0.85rem',
        color: '#9ca3af',
        marginBottom: '0.5rem',
      }}
    >
      Share this code with your friends: <strong>{lobby.code}</strong>
    </p>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        marginBottom: '0.75rem',
      }}
    >
      <div className="form-group">
        <label style={{ fontSize: '0.8rem' }}>Civilians</label>
        <input
          type="number"
          min={0}
          value={editCivilians ?? lobby.settings.civilians}
          onChange={(e) => setEditCivilians(Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label style={{ fontSize: '0.8rem' }}>Undercovers</label>
        <input
          type="number"
          min={0}
          value={editUndercovers ?? lobby.settings.undercovers}
          onChange={(e) => setEditUndercovers(Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label style={{ fontSize: '0.8rem' }}>Mr. Whites</label>
        <input
          type="number"
          min={0}
          value={editMrWhites ?? lobby.settings.mrWhites}
          onChange={(e) => setEditMrWhites(Number(e.target.value))}
        />
      </div>
    </div>

    <div className="button-row" style={{ marginBottom: '0.5rem' }}>
      <button onClick={handleSaveSettings} disabled={savingSettings}>
        {savingSettings ? 'Saving...' : 'Save Settings'}
      </button>
      <button
        onClick={handleStartGame}
        disabled={
          starting || lobby.players.length !==
          ((editCivilians ?? lobby.settings.civilians) +
            (editUndercovers ?? lobby.settings.undercovers) +
            (editMrWhites ?? lobby.settings.mrWhites))
        }
      >
        {starting ? 'Starting...' : 'Start Game'}
      </button>
    </div>

    {lobby.players.length !==
      ((editCivilians ?? lobby.settings.civilians) +
        (editUndercovers ?? lobby.settings.undercovers) +
        (editMrWhites ?? lobby.settings.mrWhites)) && (
      <p className="error" style={{ marginTop: '0.25rem' }}>
        Player count must equal total roles before starting.
      </p>
    )}

    {settingsError && (
      <p className="error" style={{ marginTop: '0.25rem' }}>
        {settingsError}
      </p>
    )}
  </div>
)}


          {actionError && (
            <p className="error" style={{ marginTop: '0.5rem' }}>
              {actionError}
            </p>
          )}

          {resetError && (
  <p className="error" style={{ marginTop: '0.5rem' }}>
    {resetError}
  </p>
)}


          {myState && lobby.status !== 'waiting' && (
            <div
              style={{
                marginTop: '1.2rem',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px dashed #374151',
              }}
            >
              <p
                style={{
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem',
                  color: '#9ca3af',
                }}
              >
                Your secret role:
              </p>
              <p style={{ fontSize: '1rem' }}>
                <strong>
                  {myState.player.role === 'civilian'
                    ? 'Civilian'
                    : myState.player.role === 'undercover'
                    ? 'Undercover'
                    : myState.player.role === 'mrwhite'
                    ? 'Mr. White'
                    : 'Unknown'}
                </strong>
                {myState.player.isEliminated &&
                  ' (eliminated from the game)'}
              </p>
              {myState.player.role === 'mrwhite' ? (
                <p
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#fbbf24',
                  }}
                >
                  You see <strong>no word</strong>. Try to guess how
                  others describe theirs!
                </p>
              ) : (
                <p
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#22c55e',
                  }}
                >
                  Your word:{' '}
                  <strong>{myState.player.word ?? '—'}</strong>
                </p>
              )}

              {myState.player.role === 'mrwhite' &&
                myState.player.isEliminated &&
                lobby.status === 'mrwhite_guess' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: '#fbbf24',
                        marginBottom: '0.25rem',
                      }}
                    >
                      You were kicked! You have **one** chance to guess
                      the civilians&apos; word:
                    </p>
                    <div className="form-group">
                      <input
                        value={mrWhiteGuess}
                        onChange={(e) =>
                          setMrWhiteGuess(e.target.value)
                        }
                        placeholder="Type your guess..."
                      />
                    </div>
                    <button
                      onClick={handleMrWhiteGuess}
                      disabled={guessLoading || !mrWhiteGuess.trim()}
                    >
                      {guessLoading ? 'Sending...' : 'Submit guess'}
                    </button>
                    {guessMessage && (
                      <p
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.85rem',
                          color: '#fbbf24',
                        }}
                      >
                        {guessMessage}
                      </p>
                    )}
                  </div>
                )}

              <p
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.8rem',
                  color: '#9ca3af',
                }}
              >
                Use voice chat / real life to talk, give clues, and
                vote. This page just handles roles, kicks, and the
                Mr. White guess.
              </p>
            </div>
          )}
        </>
      ) : (
        <p>Loading lobby...</p>
      )}

      {error && (
        <p className="error" style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
