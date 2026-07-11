const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

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

export { API_URL };
