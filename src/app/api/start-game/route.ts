// app/api/start-game/route.ts
import { NextResponse } from 'next/server';
import { startGame } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { lobbyCode } = await req.json();
  if (!lobbyCode) {
    return NextResponse.json(
      { error: 'Lobby code is required' },
      { status: 400 }
    );
  }

  try {
    const lobby = startGame(lobbyCode);
    if (!lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? 'Could not start game' },
      { status: 400 }
    );
  }
}
