import { NextResponse } from 'next/server';
import { eliminatePlayer, getLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { lobbyCode, hostId, targetId } = await req.json();

  if (!lobbyCode || !hostId || !targetId) {
    return NextResponse.json(
      { error: 'lobbyCode, hostId and targetId are required' },
      { status: 400 }
    );
  }

  const lobby = await getLobby(lobbyCode);
  if (!lobby) {
    return NextResponse.json(
      { error: 'Lobby not found' },
      { status: 404 }
    );
  }

  if (lobby.hostId !== hostId) {
    return NextResponse.json(
      { error: 'Only the host can kick players' },
      { status: 403 }
    );
  }

  const result = await eliminatePlayer(lobbyCode, targetId);
  if (!result) {
    return NextResponse.json(
      { error: 'Could not eliminate player' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    mrWhiteNeedsGuess: result.mrWhiteNeedsGuess,
    lobbyStatus: result.lobby.status,
    winner: result.lobby.winner,
  });
}
