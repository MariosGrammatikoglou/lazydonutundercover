import { NextResponse } from 'next/server';
import { updateLobbySettings } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { lobbyCode, hostId, civilians, undercovers, mrWhites } =
    await req.json();

  if (!lobbyCode || !hostId) {
    return NextResponse.json(
      { error: 'lobbyCode and hostId are required' },
      { status: 400 }
    );
  }

  const settings = {
    civilians: Number(civilians),
    undercovers: Number(undercovers),
    mrWhites: Number(mrWhites),
  };

  const total =
    settings.civilians + settings.undercovers + settings.mrWhites;
  if (total <= 0) {
    return NextResponse.json(
      { error: 'Total roles must be > 0' },
      { status: 400 }
    );
  }

  const lobby = await updateLobbySettings(
    lobbyCode,
    hostId,
    settings
  );
  if (!lobby) {
    return NextResponse.json(
      {
        error:
          'Lobby not found, you are not the host, or the game already started',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    settings: lobby.settings,
  });
}
