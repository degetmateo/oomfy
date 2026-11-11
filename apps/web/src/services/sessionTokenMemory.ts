let memoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

