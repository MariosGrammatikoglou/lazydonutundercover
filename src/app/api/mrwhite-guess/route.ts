// src/app/api/mrwhite-guess/route.ts
import { NextResponse } from 'next/server';
import { submitMrWhiteGuess } from '@/lib/gameStore';

export async function POST(req: Request) {
  const { lobbyCode, playerId, guess } = await req.json();

  if (!lobbyCode || !playerId || !guess) {
    return NextResponse.json(
      { error: 'lobbyCode, playerId and guess are required' },
      { status: 400 }
    );
  }

  const result = submitMrWhiteGuess(lobbyCode, playerId, guess);
  if (!result) {
    return NextResponse.json(
      { error: 'Could not submit guess' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    correct: result.correct,
    lobbyStatus: result.lobby.status,
    winner: result.lobby.winner,
  });
}
