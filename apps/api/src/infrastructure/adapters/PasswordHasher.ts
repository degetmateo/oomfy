import bcrypt from 'bcrypt';

export class PasswordHasher {
  private static readonly SALT_ROUNDS = 12;

  public static async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.SALT_ROUNDS);
  }

  public static async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
