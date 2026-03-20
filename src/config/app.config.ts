export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    logLevel: (process.env.LOG_LEVEL ?? 'log,error,warn').split(','),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    deviceTokenPepper: process.env.DEVICE_TOKEN_PEPPER,
  },
  storage: {
    root: process.env.STORAGE_ROOT ?? './storage',
  },
  sync: {
    pullLimit: Number(process.env.SYNC_PULL_LIMIT ?? 100),
    maxBatchSize: Number(process.env.SYNC_MAX_BATCH_SIZE ?? 100),
    maxFileSizeBytes: Number(process.env.SYNC_MAX_FILE_SIZE_BYTES ?? 5 * 1024 * 1024),
  },
});
