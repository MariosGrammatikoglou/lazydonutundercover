import { NextResponse } from 'next/server';
import { resetLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { lobbyCode, hostId } = await req.json();

  if (!lobbyCode || !hostId) {
    return NextResponse.json(
      { error: 'lobbyCode and hostId are required' },
      { status: 400 }
    );
  }

  const lobby = await resetLobby(lobbyCode, hostId);
  if (!lobby) {
    return NextResponse.json(
      { error: 'Lobby not found or you are not the host' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: lobby.status,
  });
}
