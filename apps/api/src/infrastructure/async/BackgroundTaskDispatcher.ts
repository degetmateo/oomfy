export class BackgroundTaskDispatcher {
  public static dispatch(taskName: string, task: () => Promise<void>): void {
    queueMicrotask(async () => {
      try {
        await task();
      } catch (err) {
        console.error(`🟥 [BackgroundTaskDispatcher] Error en tarea de fondo '${taskName}':`, err);
      }
    });
  }
}

