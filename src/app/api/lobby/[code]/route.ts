// src/app/api/lobby/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLobby } from '@/lib/gameStore';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  const lobby = getLobby(code);
  if (!lobby) {
    return NextResponse.json(
      { error: 'Lobby not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    code: lobby.code,
    status: lobby.status,
    winner: lobby.winner,
    settings: lobby.settings,
    players: lobby.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isEliminated: p.isEliminated,
    })),
  });
}
