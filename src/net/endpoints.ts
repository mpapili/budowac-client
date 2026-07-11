/**
 * Resolve API / gateway base URLs.
 *
 * Priority:
 *   1. Explicit Vite env (VITE_API_URL / VITE_GATEWAY_URL) when non-empty
 *   2. Same hostname the page was loaded from, fixed local ports
 *
 * So opening http://192.168.122.230:5173 hits API at
 * http://192.168.122.230:8080 (and gateway ws://…:8081), not localhost.
 */

const API_PORT = 8080;
const GATEWAY_PORT = 8081;

function pageHost(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

function pageHttpProto(): 'http' | 'https' {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https';
  }
  return 'http';
}

function pageWsProto(): 'ws' | 'wss' {
  return pageHttpProto() === 'https' ? 'wss' : 'ws';
}

function envOrEmpty(v: string | undefined): string {
  return (v ?? '').trim();
}

/** budowac-api base URL (no trailing slash). */
export const API_URL: string =
  envOrEmpty(import.meta.env.VITE_API_URL) ||
  `${pageHttpProto()}://${pageHost()}:${API_PORT}`;

/** budowac-gateway base URL (no trailing slash; /ws is appended by the client). */
export const GATEWAY_URL: string =
  envOrEmpty(import.meta.env.VITE_GATEWAY_URL) ||
  `${pageWsProto()}://${pageHost()}:${GATEWAY_PORT}`;
