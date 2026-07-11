import { MessageTag } from '../proto/tags';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'ws://localhost:8081';

export type FrameHandler = (data: unknown) => void;

/** Skeleton gateway socket. Expandable: binary frames, prediction. */
export class GatewayClient {
  private ws: WebSocket | null = null;
  onMessage: FrameHandler | null = null;

  connect(): void {
    const url = `${GATEWAY_URL}/ws`.replace(/([^:]\/)\/+/g, '$1');
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => {
      this.send({
        tag: MessageTag.Hello,
        payload: { version: '0.0.1-skel', playerName: 'browser' },
      });
    });
    this.ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(String(ev.data));
        this.onMessage?.(data);
      } catch {
        /* ignore */
      }
    });
    this.ws.addEventListener('close', () => {
      this.ws = null;
    });
  }

  send(obj: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export { GATEWAY_URL };
