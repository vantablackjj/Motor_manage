if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = require('./src/app');
const logger = require('./src/ultils/logger');
const { pool } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info('Starting server...');
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

    await pool.query('SELECT NOW()');
    logger.info('✅ Database connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down...');
      server.close(() => pool.end());
    });

  } catch (err) {
    logger.error('❌ Startup failed', err);
    process.exit(1);
  }
}

startServer();
