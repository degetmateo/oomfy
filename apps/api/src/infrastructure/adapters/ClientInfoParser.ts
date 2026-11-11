import { Request } from 'express';
import requestIp from 'request-ip';

export class ClientInfoParser {
  public static extractClientIp(req: Request): string {
    const rawIp =
      req.ip ||
      (req.socket?.remoteAddress ? req.socket.remoteAddress : requestIp.getClientIp(req)) ||
      '127.0.0.1';

    if (rawIp === '::1' || rawIp === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    if (rawIp.startsWith('::ffff:')) {
      return rawIp.substring(7);
    }
    return rawIp;
  }

  public static parseDevicePlatform(userAgent?: string): string {
    if (!userAgent) return 'Web Desconocido';

    const ua = userAgent.toLowerCase();
    let os = 'Dispositivo';
    let browser = '';

    if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';
    else if (ua.includes('windows phone')) os = 'Windows Phone';
    else if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
    else if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('cros')) os = 'Chrome OS';
    else if (ua.includes('linux')) os = 'Linux';

    if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge';
    else if (ua.includes('opr/') || ua.includes('opera/')) browser = 'Opera';
    else if (ua.includes('samsungbrowser/')) browser = 'Samsung Internet';
    else if (ua.includes('chrome/') || ua.includes('crios/')) browser = 'Chrome';
    else if (ua.includes('firefox/') || ua.includes('fxios/')) browser = 'Firefox';
    else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';
    else browser = 'Navegador Web';

    return `${os} • ${browser}`;
  }
}

