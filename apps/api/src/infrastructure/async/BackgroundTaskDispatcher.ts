export class BackgroundTaskDispatcher {
  private static queue: Array<{ name: string; task: () => Promise<void> }> = [];
  private static isProcessing = false;
  private static idleResolvers: Array<() => void> = [];

  public static dispatch(taskName: string, task: () => Promise<void>): void {
    this.queue.push({ name: taskName, task });
    this.scheduleProcessing();
  }

  public static enqueueSteps(prefix: string, steps: Array<() => Promise<void>>): void {
    steps.forEach((step, idx) => {
      this.queue.push({ name: `${prefix}:step-${idx + 1}`, task: step });
    });
    this.scheduleProcessing();
  }

  public static waitForIdle(): Promise<void> {
    if (!this.isProcessing && this.queue.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  private static scheduleProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    queueMicrotask(() => {
      void this.processQueue();
    });
  }

  private static async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const current = this.queue.shift()!;
      try {
        await current.task();
      } catch (err) {
        console.error(`🟥 [BackgroundTaskDispatcher] Error en tarea de fondo '${current.name}':`, err);
      }
    }
    this.isProcessing = false;
    while (this.idleResolvers.length > 0) {
      const resolve = this.idleResolvers.shift()!;
      resolve();
    }
  }
}
