import { createHash } from 'crypto';

export function createSha256Hash(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}
