'use client';

import { useEffect, useState } from 'react';

type LobbyStatus = 'waiting' | 'started' | 'mrwhite_guess' | 'finished';
type Winner = 'civilians' | 'undercovers' | 'mrwhite' | null;

type LobbyPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  isEliminated: boolean;
};

type LobbySummary = {
  code: string;
  status: LobbyStatus;
  winner: Winner;
  settings: {
    civilians: number;
    undercovers: number;
    mrWhites: number;
  };
  players: LobbyPlayer[];
};

type MyState = {
  lobbyStatus: LobbyStatus;
  winner: Winner;
  player: {
    id: string;
    name: string;
    role?: 'civilian' | 'undercover' | 'mrwhite';
    word: string | null;
    isHost: boolean;
    isEliminated: boolean;
  };
};

export default function LobbyClient({
  lobbyCode,
  playerId,
}: {
  lobbyCode: string;
  playerId: string;
}) {
  const [lobby, setLobby] = useState<LobbySummary | null>(null);
  const [myState, setMyState] = useState<MyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kickLoading, setKickLoading] = useState<string | null>(null);
  const [mrWhiteGuess, setMrWhiteGuess] = useState('');
  const [mrWhiteSubmitting, setMrWhiteSubmitting] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [kickFromLobbyLoading, setKickFromLobbyLoading] = useState<string | null>(null);


  const isHost = !!myState?.player.isHost;
  const status = lobby?.status ?? 'waiting';

  async function fetchLobby() {
    try {
      const [lobbyRes, myRes] = await Promise.all([
        fetch(`/api/lobby/${lobbyCode}`),
        fetch('/api/my-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lobbyCode, playerId }),
        }),
      ]);

      if (lobbyRes.ok) {
        setLobby(await lobbyRes.json());
      } else {
        const e = await lobbyRes.json().catch(() => ({}));
        setError(e.error ?? 'Failed to load lobby');
      }

      if (myRes.ok) {
        setMyState(await myRes.json());
      } else {
        const e = await myRes.json().catch(() => ({}));
        setError(e.error ?? 'Failed to load your state');
      }
    } catch (err) {
      console.error(err);
      setError('Network error while loading lobby');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLobby();
    const id = setInterval(fetchLobby, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyCode, playerId]);

  async function handleStartGame() {
    setError(null);
    setStartLoading(true);
    try {
      const res = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not start game');
      } else {
        await fetchLobby();
      }
    } catch (err) {
      console.error(err);
      setError('Network error while starting game');
    } finally {
      setStartLoading(false);
    }
  }

  async function handleKickPlayer(targetId: string) {
    setError(null);
    setKickLoading(targetId);
    try {
      const res = await fetch('/api/kick-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyCode,
          hostId: myState?.player.id,
          targetId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not kick player');
      } else {
        await fetchLobby();
      }
    } catch (err) {
      console.error(err);
      setError('Network error while kicking player');
    } finally {
      setKickLoading(null);
    }
  }

  async function handleKickFromLobby(targetId: string) {
  setError(null);
  setKickFromLobbyLoading(targetId);
  try {
    const res = await fetch('/api/kick-from-lobby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lobbyCode,
        hostId: myState?.player.id,
        targetId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not kick from lobby');
    } else {
      await fetchLobby();
    }
  } catch (err) {
    console.error(err);
    setError('Network error while kicking from lobby');
  } finally {
    setKickFromLobbyLoading(null);
  }
}


  async function handleMrWhiteGuess() {
    if (!mrWhiteGuess.trim()) return;
    setError(null);
    setMrWhiteSubmitting(true);
    try {
      const res = await fetch('/api/mrwhite-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyCode,
          playerId: myState?.player.id,
          guess: mrWhiteGuess,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not submit guess');
      } else {
        await fetchLobby();
      }
    } catch (err) {
      console.error(err);
      setError('Network error while submitting guess');
    } finally {
      setMrWhiteSubmitting(false);
    }
  }

  async function handleReset() {
    setError(null);
    setResetLoading(true);
    try {
      const res = await fetch('/api/reset-lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyCode,
          hostId: myState?.player.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not reset lobby');
      } else {
        await fetchLobby();
      }
    } catch (err) {
      console.error(err);
      setError('Network error while resetting lobby');
    } finally {
      setResetLoading(false);
    }
  }

  if (loading || !lobby || !myState) {
    return (
      <div className="card">
        <p>Loading lobby...</p>
      </div>
    );
  }

  const my = myState.player;

  return (
    <div className="card">
      <h2>Lobby {lobby.code}</h2>
      <p
        style={{
          marginBottom: '0.75rem',
          fontSize: '0.9rem',
          color: '#9ca3af',
        }}
      >
        You are <strong>{my.name}</strong>{' '}
        {my.isHost && <span>(Host)</span>}
      </p>

      {error && <div className="error">{error}</div>}

      {/* 👇 PLAYERS WITH USERNAMES */}
      <section style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>
          Players in lobby ({lobby.players.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lobby.players.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'space-between',
                background: '#020617',
                padding: '0.4rem 0.6rem',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{p.name}</span> {/* 👈 USERNAME */}
                {p.id === my.id && <span className="badge">You</span>}
                {p.isHost && <span className="badge">Host</span>}
                {p.isEliminated && <span className="badge">Out</span>}
              </div>

              {/* Before game: host can kick from lobby (remove completely) */}
{isHost &&
  status === 'waiting' &&
  p.id !== my.id && ( // don’t allow host to kick themselves from lobby here
    <button
      onClick={() => handleKickFromLobby(p.id)}
      disabled={kickFromLobbyLoading === p.id}
      className="button-secondary"
      style={{ padding: '0.15rem 0.5rem' }}
    >
      {kickFromLobbyLoading === p.id ? 'Removing...' : 'Kick from lobby'}
    </button>
  )}

{/* During game: host can kick from game (eliminate) */}
{isHost &&
  status !== 'waiting' &&
  status !== 'finished' &&
  !p.isEliminated && (
    <button
      onClick={() => handleKickPlayer(p.id)}
      disabled={kickLoading === p.id}
      className="button-secondary"
      style={{ padding: '0.15rem 0.5rem' }}
    >
      {kickLoading === p.id ? 'Kicking...' : 'Kick from game'}
    </button>
  )}

            </div>
          ))}
        </div>
      </section>

      {/* status + your role/word + controls as before */}
      <section style={{ marginTop: '1.25rem' }}>
        <h3>Game status</h3>
        <p>Status: <strong>{status}</strong></p>
        {lobby.winner && (
          <p>
            Winner:{' '}
            <strong style={{ textTransform: 'capitalize' }}>
              {lobby.winner}
            </strong>
          </p>
        )}
        <div style={{ marginTop: '0.75rem' }}>
          <p>Your role: <strong>{my.role ?? 'Unknown'}</strong></p>
          <p>
            Your word:{' '}
            <strong>{my.word ?? (my.role === 'mrwhite' ? 'None' : '-')}</strong>
          </p>
        </div>
      </section>

      <section style={{ marginTop: '1.25rem' }}>
        {isHost && status === 'waiting' && (
          <button onClick={handleStartGame} disabled={startLoading}>
            {startLoading ? 'Starting...' : 'Start Game'}
          </button>
        )}

        {status === 'mrwhite_guess' &&
          my.role === 'mrwhite' &&
          !my.isEliminated && (
            <div style={{ marginTop: '1rem' }}>
              <p>Guess the civilians&apos; word:</p>
              <input
                value={mrWhiteGuess}
                onChange={(e) => setMrWhiteGuess(e.target.value)}
                placeholder="Type your guess..."
              />
              <button
                onClick={handleMrWhiteGuess}
                disabled={mrWhiteSubmitting}
                style={{ marginTop: '0.4rem' }}
              >
                {mrWhiteSubmitting ? 'Submitting...' : 'Submit Guess'}
              </button>
            </div>
          )}

        {isHost && status === 'finished' && (
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleReset} disabled={resetLoading}>
              {resetLoading ? 'Resetting...' : 'Play Again (Reset Lobby)'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
