import { NextResponse } from 'next/server';
import { getPlayerState } from '@/lib/gameStore';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { lobbyCode, playerId } = body ?? {};

  if (!lobbyCode || !playerId) {
    // Return a harmless empty state instead of 400
    return NextResponse.json({
      lobbyStatus: 'waiting',
      winner: null,
      player: {
        id: playerId ?? '',
        name: '',
        role: undefined,
        word: null,
        isHost: false,
        isEliminated: false,
      },
    });
  }

  const result = await getPlayerState(lobbyCode, playerId);
  if (!result) {
    return NextResponse.json(
      { error: 'Player or lobby not found' },
      { status: 404 }
    );
  }

  const { lobby, player } = result;

  return NextResponse.json({
    lobbyStatus: lobby.status,
    winner: lobby.winner,
    player: {
      id: player.id,
      name: player.name,
      role: player.role,
      word: player.word ?? null,
      isHost: player.isHost,
      isEliminated: player.isEliminated,
    },
  });
}
