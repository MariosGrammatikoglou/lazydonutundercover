import { NextResponse } from 'next/server';
import { kickFromLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { lobbyCode, hostId, targetId } = body ?? {};

  if (!lobbyCode || !hostId || !targetId) {
    return NextResponse.json(
      { error: 'lobbyCode, hostId and targetId are required' },
      { status: 400 }
    );
  }

  const lobby = await kickFromLobby(lobbyCode, hostId, targetId);
  if (!lobby) {
    return NextResponse.json(
      { error: 'Could not kick player from lobby' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    playersCount: lobby.players.length,
  });
}
