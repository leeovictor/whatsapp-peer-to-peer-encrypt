import { authService } from '../auth/auth.service';

export function verifyWsToken(token: string): { sub: string; username: string } | null {
  try {
    return authService.verifyToken(token);
  } catch {
    return null;
  }
}
