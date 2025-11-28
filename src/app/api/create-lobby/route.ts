import { NextResponse } from 'next/server';
import { createLobby } from '@/lib/gameStore';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { username, civilians, undercovers, mrWhites } = body ?? {};

  const safeUsername =
    typeof username === 'string' && username.trim().length > 0
      ? username.trim()
      : 'Host';

  const c = Number.isFinite(Number(civilians)) ? Number(civilians) : 0;
  const u = Number.isFinite(Number(undercovers)) ? Number(undercovers) : 0;
  const m = Number.isFinite(Number(mrWhites)) ? Number(mrWhites) : 0;

  const settings = {
    civilians: c,
    undercovers: u,
    mrWhites: m,
  };

  const totalRoles = c + u + m;

  if (totalRoles <= 0) {
    return NextResponse.json(
      { error: 'Total roles (civilians + undercovers + mr whites) must be > 0' },
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
