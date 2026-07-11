import { API_URL } from './endpoints';

export async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listWorlds(): Promise<unknown> {
  const res = await fetch(`${API_URL}/v1/worlds`);
  if (!res.ok) throw new Error(`worlds ${res.status}`);
  return res.json();
}

export interface AuthToken {
  token: string;
  playerId: string;
  expiresAt: number;
}

/** Issue a dev token embedding playerId (POST /v1/auth/token). */
export async function fetchToken(playerId: string): Promise<AuthToken> {
  const url = `${API_URL}/v1/auth/token?playerId=${encodeURIComponent(playerId)}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`token ${res.status}`);
  return (await res.json()) as AuthToken;
}

export { API_URL };
