import { NextResponse } from 'next/server';
import { submitBlindGuess } from '@/lib/gameStore';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { lobbyCode, playerId, guess } = body ?? {};

  if (!lobbyCode || !playerId || typeof guess !== 'string') {
    return NextResponse.json(
      { error: 'lobbyCode, playerId and guess are required' },
      { status: 400 }
    );
  }

  const lobby = await submitBlindGuess(lobbyCode, playerId, guess);
  if (!lobby) {
    return NextResponse.json(
      { error: 'Could not submit Blind guess' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
