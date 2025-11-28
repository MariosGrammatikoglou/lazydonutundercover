import LobbyClient from './LobbyClient';

type LobbyPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ playerId?: string }>;
};

export default async function LobbyPage({ params, searchParams }: LobbyPageProps) {
  const { code } = await params;
  const sp = await searchParams;

  const lobbyCode = code;
  const playerId = sp?.playerId ?? '';

  return <LobbyClient lobbyCode={lobbyCode} playerId={playerId} />;
}
