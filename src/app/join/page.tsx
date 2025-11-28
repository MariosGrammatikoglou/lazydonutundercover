import JoinLobbyClient from './JoinLobbyClient';

type JoinPageProps = {
  searchParams: Promise<{ username?: string }>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const username = params?.username ?? '';
  return <JoinLobbyClient defaultUsername={username} />;
}
