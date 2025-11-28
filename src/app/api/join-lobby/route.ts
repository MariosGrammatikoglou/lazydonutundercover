import { NextResponse } from 'next/server';
import { joinLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { username, lobbyCode, hostCode } = body ?? {};

  if (!lobbyCode || typeof lobbyCode !== 'string') {
    return NextResponse.json(
      { error: 'Lobby code is required' },
      { status: 400 }
    );
  }

  const safeUsername =
    typeof username === 'string' && username.trim().length > 0
      ? username.trim()
      : 'Player';

  const result = await joinLobby(lobbyCode, safeUsername, hostCode);
  if (!result) {
    return NextResponse.json(
      { error: 'Lobby not found or already started' },
      { status: 400 }
    );
  }

  const { lobby, player } = result;

  return NextResponse.json({
    lobbyCode: lobby.code,
    playerId: player.id,
  });
}
