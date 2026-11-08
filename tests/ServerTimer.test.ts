import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServerTimer } from '../src/server/ServerTimer.js';

describe('ServerTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicjuje stan z domyślnym czasem trwania', () => {
    const timer = new ServerTimer(30);
    const state = timer.getState();
    expect(state.duration).toBe(30);
    expect(state.remaining).toBe(30);
    expect(state.isRunning).toBe(false);
  });

  it('startuje odliczanie i emituje stan', () => {
    let tickCount = 0;
    const timer = new ServerTimer(30, () => {
      tickCount++;
    });

    timer.start();
    expect(timer.getState().isRunning).toBe(true);
    expect(tickCount).toBeGreaterThan(0);

    // Advance 5 seconds
    vi.advanceTimersByTime(5000);
    expect(timer.getState().remaining).toBeLessThanOrEqual(25);

    timer.stop();
  });

  it('pauza i wznowienie zachowuje pozostały czas', () => {
    const timer = new ServerTimer(30);
    timer.start();

    vi.advanceTimersByTime(10000); // 10s elapsed
    timer.pause();
    expect(timer.getState().isRunning).toBe(false);
    const remainingAtPause = timer.getState().remaining;
    expect(remainingAtPause).toBe(20);

    // Time passes while paused
    vi.advanceTimersByTime(5000);
    expect(timer.getState().remaining).toBe(20);

    // Resume
    timer.resume();
    expect(timer.getState().isRunning).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(timer.getState().remaining).toBe(15);

    timer.stop();
  });

  it('wywołuje onExpire gdy czas dobiegnie końca', () => {
    let expired = false;
    const timer = new ServerTimer(5, undefined, () => {
      expired = true;
    });

    timer.start();
    expect(expired).toBe(false);

    vi.advanceTimersByTime(5100);
    expect(expired).toBe(true);
    expect(timer.getState().remaining).toBe(0);
    expect(timer.getState().isRunning).toBe(false);
  });

  it('dodaje dodatkowy czas do aktywnego timera', () => {
    const timer = new ServerTimer(10);
    timer.start();

    vi.advanceTimersByTime(5000); // 5s left
    expect(timer.getState().remaining).toBe(5);

    timer.addTime(10); // add 10s -> 15s left
    expect(timer.getState().remaining).toBe(15);

    timer.stop();
  });
});
