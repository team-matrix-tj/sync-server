import { posix as path } from 'path';
import { DomainError } from '../errors/domain-error';

export function normalizeWorkspacePath(inputPath: string): string {
  const trimmed = inputPath.trim();
  const normalized = path.normalize(trimmed);

  const invalid =
    !trimmed ||
    trimmed.startsWith('/') ||
    trimmed.includes('\\') ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.includes('\u0000');

  if (invalid) {
    throw new DomainError('INVALID_PATH', 'Path is invalid or unsafe', 400, {
      path: inputPath,
    });
  }

  return normalized.replace(/^\.\//, '');
}
