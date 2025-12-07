import { NextResponse } from 'next/server';
import { updateLobbySettings } from '@/lib/gameStore';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { lobbyCode, hostId, legits, clones, blinds } = body ?? {};

  if (!lobbyCode || !hostId) {
    return NextResponse.json(
      { error: 'lobbyCode and hostId are required' },
      { status: 400 }
    );
  }

  const lobby = await updateLobbySettings(lobbyCode, hostId, {
    legits: Number(legits ?? 0),
    clones: Number(clones ?? 0),
    blinds: Number(blinds ?? 0),
  });

  if (!lobby) {
    return NextResponse.json(
      { error: 'Could not update settings (are you the host? is lobby waiting?)' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    settings: lobby.settings,
  });
}
