import { DomainError } from '../errors/domain-error';

export function decodeBase64Content(contentBase64: string, maxSizeBytes: number): Buffer {
  const buffer = Buffer.from(contentBase64, 'base64');

  if (buffer.toString('base64') !== contentBase64.replace(/\s+/g, '')) {
    throw new DomainError('INVALID_CONTENT_BASE64', 'contentBase64 must be valid base64', 400);
  }

  if (buffer.byteLength > maxSizeBytes) {
    throw new DomainError('FILE_TOO_LARGE', 'File content exceeds configured size limit', 413, {
      maxSizeBytes,
      actualSizeBytes: buffer.byteLength,
    });
  }

  return buffer;
}
