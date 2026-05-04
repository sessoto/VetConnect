import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import { startScheduler } from './scheduler/index.js';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'VetConnect API listening');
  startScheduler();
});
