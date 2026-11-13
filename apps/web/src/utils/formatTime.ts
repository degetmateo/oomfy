/**
 * Formatea una fecha a tiempo relativo compacto usando unidades completas transcurridas (floor):
 * Ns, Nm, Nh, Nd, Nmes, Na.
 */
export function formatRelativeTime(dateInput: string | Date, nowMs: number = Date.now()): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const timeMs = date.getTime();
  if (Number.isNaN(timeMs)) return '';

  const diffSec = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
  if (diffSec < 60) return `${diffSec}s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;

  if (diffDays < 365) {
    const diffMonths = Math.max(1, Math.min(11, Math.floor(diffDays / 30)));
    return `${diffMonths}m`;
  }

  return `${Math.floor(diffDays / 365)}a`;
}

/**
 * Formatea fecha y hora exactas en la zona horaria local del navegador del usuario.
 */
export function formatExactDateTime(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'long',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Formatea la marca de tiempo de un mensaje en reloj de 24h (zona horaria del usuario),
 * mostrando fecha y hora si pasó más de un día desde su envío.
 */
export function formatMessageTimestamp(
  dateInput: string | Date,
  nowMs: number = Date.now(),
  allowDate: boolean = true
): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const timeMs = date.getTime();
  if (Number.isNaN(timeMs)) return '';

  const showDate = allowDate && nowMs - timeMs > 24 * 60 * 60 * 1000;
  const options: Intl.DateTimeFormatOptions = showDate
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/**
 * Formatea la marca de tiempo de una notificación mostrando fecha, hora y tiempo relativo:
 * "DD/MM/YYYY, HH:MM • hace Ns" o "hace Nmin".
 */
export function formatNotificationTime(
  dateInput: string | Date,
  nowMs: number = Date.now()
): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const timeMs = date.getTime();
  if (Number.isNaN(timeMs)) return '';

  const dateStr = date.toLocaleDateString();
  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  const relStr = formatRelativeTime(date, nowMs);

  return `${dateStr}, ${timeStr} • hace ${relStr}`;
}


