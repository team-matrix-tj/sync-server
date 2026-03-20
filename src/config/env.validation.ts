type EnvShape = Record<string, string | undefined>;

function assertValue(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Environment validation failed: ${message}`);
  }
}

export function validateEnv(config: EnvShape): EnvShape {
  assertValue(Boolean(config.DATABASE_URL), 'DATABASE_URL is required');
  assertValue(Boolean(config.DEVICE_TOKEN_PEPPER), 'DEVICE_TOKEN_PEPPER is required');

  const numericKeys = ['PORT', 'SYNC_PULL_LIMIT', 'SYNC_MAX_BATCH_SIZE', 'SYNC_MAX_FILE_SIZE_BYTES'];
  for (const key of numericKeys) {
    const raw = config[key];
    if (raw === undefined) {
      continue;
    }

    assertValue(/^[0-9]+$/.test(raw), `${key} must be a positive integer`);
    assertValue(Number(raw) > 0, `${key} must be greater than zero`);
  }

  return config;
}
