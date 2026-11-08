import { TimerState } from '../types/socket.js';

export type TimerTickCallback = (state: TimerState) => void;
export type TimerExpireCallback = () => void;

export class ServerTimer {
  private duration: number = 30; // seconds
  private remaining: number = 30; // seconds
  private isRunning: boolean = false;
  private startedAt: number | null = null;
  private expiresAt: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  private onTickCallback?: TimerTickCallback;
  private onExpireCallback?: TimerExpireCallback;

  constructor(
    defaultDurationSec: number = 30,
    onTick?: TimerTickCallback,
    onExpire?: TimerExpireCallback
  ) {
    this.duration = defaultDurationSec;
    this.remaining = defaultDurationSec;
    this.onTickCallback = onTick;
    this.onExpireCallback = onExpire;
  }

  public setCallbacks(onTick?: TimerTickCallback, onExpire?: TimerExpireCallback): void {
    if (onTick) this.onTickCallback = onTick;
    if (onExpire) this.onExpireCallback = onExpire;
  }

  public start(durationSeconds?: number): void {
    this.stop();

    if (durationSeconds !== undefined && durationSeconds > 0) {
      this.duration = durationSeconds;
      this.remaining = durationSeconds;
    } else {
      this.remaining = this.duration;
    }

    const now = Date.now();
    this.startedAt = now;
    this.expiresAt = now + this.remaining * 1000;
    this.isRunning = true;

    this.emitTick();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 250);
  }

  private tick(): void {
    if (!this.isRunning || !this.expiresAt) return;

    const now = Date.now();
    const msLeft = this.expiresAt - now;

    if (msLeft <= 0) {
      this.remaining = 0;
      this.isRunning = false;
      this.stopInterval();
      this.emitTick();
      if (this.onExpireCallback) {
        this.onExpireCallback();
      }
      return;
    }

    // Convert to seconds with 1 decimal precision
    this.remaining = Math.max(0, Math.ceil(msLeft / 1000));
    this.emitTick();
  }

  public pause(): void {
    if (!this.isRunning || !this.expiresAt) return;

    const now = Date.now();
    const msLeft = Math.max(0, this.expiresAt - now);
    this.remaining = Math.ceil(msLeft / 1000);
    this.isRunning = false;
    this.expiresAt = null;
    this.stopInterval();

    this.emitTick();
  }

  public resume(): void {
    if (this.isRunning || this.remaining <= 0) return;

    const now = Date.now();
    this.startedAt = now;
    this.expiresAt = now + this.remaining * 1000;
    this.isRunning = true;

    this.emitTick();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 250);
  }

  public stop(): void {
    this.isRunning = false;
    this.startedAt = null;
    this.expiresAt = null;
    this.stopInterval();
  }

  public reset(durationSeconds?: number): void {
    this.stop();
    if (durationSeconds !== undefined && durationSeconds > 0) {
      this.duration = durationSeconds;
    }
    this.remaining = this.duration;
    this.emitTick();
  }

  public addTime(seconds: number): void {
    this.remaining = Math.max(0, this.remaining + seconds);
    if (this.isRunning && this.expiresAt) {
      this.expiresAt += seconds * 1000;
    }
    this.emitTick();
  }

  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private emitTick(): void {
    if (this.onTickCallback) {
      this.onTickCallback(this.getState());
    }
  }

  public getState(): TimerState {
    return {
      duration: this.duration,
      remaining: this.remaining,
      isRunning: this.isRunning,
      startedAt: this.startedAt,
      expiresAt: this.expiresAt
    };
  }
}
