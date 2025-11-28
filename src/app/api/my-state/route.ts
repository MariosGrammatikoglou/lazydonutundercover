// src/app/api/my-state/route.ts
import { NextResponse } from 'next/server';
import { getPlayerState } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { lobbyCode, playerId } = await req.json();

  if (!lobbyCode || !playerId) {
    return NextResponse.json(
      { error: 'lobbyCode and playerId required' },
      { status: 400 }
    );
  }

  const result = getPlayerState(lobbyCode, playerId);
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
