import { MessageTag } from '../proto/tags';
import type { Edit, PlayerInput, Snapshot, ChunkDiff } from '../proto/types';
import { GATEWAY_URL } from './endpoints';

export type FrameHandler = (tag: MessageTag, payload: unknown, raw: unknown) => void;
export type StatusHandler = (connected: boolean, detail: string) => void;

export interface AuthResult {
  ok: boolean;
  sessionId?: string;
  playerId?: string;
  gameId?: string;
}

/**
 * Gateway WebSocket client (budowac-gateway).
 * Hello/Auth + PlayerInput/Edit outbound; Snapshot/ChunkDiff inbound.
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  onFrame: FrameHandler | null = null;
  onStatus: StatusHandler | null = null;
  onAuth: ((r: AuthResult) => void) | null = null;
  private intentionalClose = false;
  private pendingToken: string | null = null;

  sessionId: string | null = null;
  playerId: string | null = null;
  gameId: string | null = null;

  connect(): void {
    if (this.ws) return;
    this.intentionalClose = false;
    const url = `${GATEWAY_URL}/ws`.replace(/([^:]\/)\/+/g, '$1');
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      this.onStatus?.(false, `connect error: ${(e as Error).message}`);
      return;
    }
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.onStatus?.(true, 'connected');
      this.send({
        tag: MessageTag.Hello,
        payload: { version: '0.0.1-game', playerName: this.playerId ?? 'browser' },
      });
      if (this.pendingToken) {
        this.sendAuth(this.pendingToken);
        this.pendingToken = null;
      }
    });

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as Record<string, unknown>;
        // Auth reply is a flat envelope {tag, ok, sessionId, playerId}
        if (data.tag === MessageTag.Auth || data.tag === 'Auth') {
          const ok = Boolean(data.ok);
          if (ok) {
            this.sessionId = String(data.sessionId ?? '');
            this.playerId = String(data.playerId ?? this.playerId ?? '');
            this.gameId = String(data.gameId ?? 'local-dev');
          }
          this.onAuth?.({
            ok,
            sessionId: this.sessionId ?? undefined,
            playerId: this.playerId ?? undefined,
            gameId: this.gameId ?? undefined,
          });
          return;
        }

        const tag = data.tag as MessageTag;
        const payload = data.payload ?? data;
        this.onFrame?.(tag, payload, data);
      } catch {
        /* ignore non-JSON during skeleton phase */
      }
    });

    ws.addEventListener('close', () => {
      this.ws = null;
      this.sessionId = null;
      this.onStatus?.(false, this.intentionalClose ? 'closed' : 'disconnected');
    });

    ws.addEventListener('error', () => {
      this.onStatus?.(false, 'socket error');
    });
  }

  /** Queue or send Auth once socket is open. */
  authenticate(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendAuth(token);
    } else {
      this.pendingToken = token;
    }
  }

  private sendAuth(token: string): void {
    this.send({ tag: MessageTag.Auth, payload: { token } });
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.ws?.close();
    this.ws = null;
  }

  send(obj: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  sendInput(input: PlayerInput): void {
    this.send({ tag: MessageTag.PlayerInput, payload: input });
  }

  sendEdit(edit: Edit): void {
    this.send({ tag: MessageTag.Edit, payload: edit });
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get authenticated(): boolean {
    return Boolean(this.sessionId);
  }
}

export type { Snapshot, ChunkDiff, PlayerInput, Edit };
export { GATEWAY_URL } from './endpoints';
