import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { AuthSessionValidator } from '../auth/AuthSessionValidator.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class UserStatusEnforcementHelper {
  public static async onStatusUpdated(userId: string, status?: string): Promise<void> {
    if (status === 'suspended') {
      await PostgresSessionRepository.revokeUserSessions(userId);
      AuthSessionValidator.suspendUser(userId);
      SocketGateway.disconnectUser(userId);
    } else if (status === 'active') {
      AuthSessionValidator.unsuspendUser(userId);
    }
  }
}

