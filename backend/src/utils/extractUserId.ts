import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Extracts and verifies the user ID from a Bearer token header.
 * Throws UnauthorizedException if the header is missing or the token is invalid.
 */
export function extractUserId(
  jwtService: JwtService,
  authHeader?: string,
): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing or invalid token');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwtService.verify(token);
    return decoded.sub;
  } catch {
    throw new UnauthorizedException('Invalid token');
  }
}
