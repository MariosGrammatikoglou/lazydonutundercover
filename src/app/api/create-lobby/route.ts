import { NextResponse } from 'next/server';
import { createLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { username, legit, clones, blinds } = body ?? {};

  const safeUsername =
    typeof username === 'string' && username.trim().length > 0
      ? username.trim()
      : 'Host';

  const c = Number.isFinite(Number(legit)) ? Number(legit) : 0;
  const u = Number.isFinite(Number(clones)) ? Number(clones) : 0;
  const m = Number.isFinite(Number(blinds)) ? Number(blinds) : 0;

  const settings = {
    legits: c,
    clones: u,
    blinds: m,
  };

  const totalRoles = c + u + m;

  if (totalRoles <= 0) {
    return NextResponse.json(
      { error: 'Total roles (legits + clones + blinds) must be > 0' },
      { status: 400 }
    );
  }

  try {
    const { lobby, player, hostSecret } = await createLobby(
      safeUsername,
      settings
    );

    return NextResponse.json({
      lobbyCode: lobby.code,
      playerId: player.id,
      hostCode: hostSecret,
    });
  } catch (err: any) {
    console.error('Error in create-lobby:', err);
    return NextResponse.json(
      { error: 'Failed to create lobby on server' },
      { status: 500 }
    );
  }
}
