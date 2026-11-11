import { describe, it, expect, vi } from 'vitest';
import { BackgroundTaskDispatcher } from '../src/infrastructure/async/BackgroundTaskDispatcher.js';

describe('BackgroundTaskDispatcher', () => {
  it('executes task asynchronously without blocking caller', async () => {
    let executed = false;
    BackgroundTaskDispatcher.dispatch('test-async-task', async () => {
      executed = true;
    });

    expect(executed).toBe(false);
    await Promise.resolve();
    expect(executed).toBe(true);
  });

  it('catches and logs errors without throwing to caller', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    BackgroundTaskDispatcher.dispatch('failing-task', async () => {
      throw new Error('Async failure simulation');
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BackgroundTaskDispatcher] Error en tarea de fondo'),
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
