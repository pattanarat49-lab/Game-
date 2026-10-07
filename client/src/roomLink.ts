import { Client, Room } from "colyseus.js";

type Handler = (message: any) => void;

/**
 * An online room that survives a dropped connection (a phone switching networks, a short signal loss):
 * when the socket closes unexpectedly it reconnects to the same seat with the room's reconnection token,
 * and hands the old message handlers to the new connection. Only when that keeps failing does `onLeave` fire.
 */
export class RoomLink {
  private handlers: [string, Handler][] = [];
  private stateHandlers: ((state: any) => void)[] = [];
  private leaveHandlers: ((code: number) => void)[] = [];
  private leaving = false;
  /** True while a reconnection is being tried (the scene shows a notice). */
  reconnecting = false;

  constructor(
    private client: Client,
    private inner: Room<any>,
  ) {
    this.attach();
  }

  get state() {
    return this.inner.state;
  }

  get sessionId() {
    return this.inner.sessionId;
  }

  send(type: string, message?: unknown) {
    if (this.reconnecting) return; // dropped while the socket is down; the next input goes out once it is back
    try {
      this.inner.send(type, message);
    } catch {
      // the socket just closed; onLeave takes it from here
    }
  }

  onMessage(type: string, cb: Handler) {
    this.handlers.push([type, cb]);
    this.inner.onMessage(type, cb);
  }

  onStateChange(cb: (state: any) => void) {
    this.stateHandlers.push(cb);
    this.inner.onStateChange(cb);
  }

  onLeave(cb: (code: number) => void) {
    this.leaveHandlers.push(cb);
  }

  leave(consented = true) {
    this.leaving = true;
    return this.inner.leave(consented);
  }

  private attach() {
    this.inner.onLeave((code: number) => {
      // 1000 = a normal close (we left, or the room closed on purpose): no reconnecting.
      if (this.leaving || code === 1000) {
        for (const cb of this.leaveHandlers) cb(code);
        return;
      }
      void this.reconnect(code);
    });
  }

  private async reconnect(code: number) {
    this.reconnecting = true;
    const token = this.inner.reconnectionToken;
    const started = performance.now();
    let wait = 500;
    while (!this.leaving && performance.now() - started < 18000) {
      await new Promise((r) => setTimeout(r, wait));
      wait = Math.min(2000, wait * 1.5);
      try {
        const room = await this.client.reconnect(token);
        this.inner = room;
        for (const [type, cb] of this.handlers) room.onMessage(type, cb);
        for (const cb of this.stateHandlers) room.onStateChange(cb);
        this.attach();
        this.reconnecting = false;
        return;
      } catch {
        // not back yet: try again
      }
    }
    this.reconnecting = false;
    if (!this.leaving) for (const cb of this.leaveHandlers) cb(code);
  }
}
