import { describe, expect, it, vi } from 'vitest';

describe('endpoints', () => {
  it('uses VITE_API_URL when set', async () => {
    vi.stubEnv('VITE_API_URL', 'http://custom-api:9999');
    vi.resetModules();
    const mod = await import('./endpoints');
    expect(mod.API_URL).toBe('http://custom-api:9999');
    vi.unstubAllEnvs();
  });

  it('uses VITE_GATEWAY_URL when set', async () => {
    vi.stubEnv('VITE_GATEWAY_URL', 'wss://custom-gw:7777');
    vi.resetModules();
    const mod = await import('./endpoints');
    expect(mod.GATEWAY_URL).toBe('wss://custom-gw:7777');
    vi.unstubAllEnvs();
  });
});
