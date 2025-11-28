import { NextResponse } from 'next/server';
import { createLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { username, civilians, undercovers, mrWhites } = await req.json();

  if (!username || typeof username !== 'string') {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  const settings = {
    civilians: Number(civilians),
    undercovers: Number(undercovers),
    mrWhites: Number(mrWhites),
  };

  const totalRoles =
    settings.civilians + settings.undercovers + settings.mrWhites;

  if (totalRoles <= 0) {
    return NextResponse.json(
      { error: 'Total roles must be > 0' },
      { status: 400 }
    );
  }

  const { lobby, player, hostSecret } = createLobby(username, settings);

  return NextResponse.json({
    lobbyCode: lobby.code,
    playerId: player.id,
    hostCode: hostSecret, // 👈 important
  });
}
