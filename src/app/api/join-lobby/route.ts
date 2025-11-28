import { NextResponse } from 'next/server';
import { joinLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { username, lobbyCode, hostCode } = await req.json();

  if (!username || !lobbyCode) {
    return NextResponse.json(
      { error: 'Username and lobby code are required' },
      { status: 400 }
    );
  }

  const result = joinLobby(lobbyCode, username, hostCode);
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
