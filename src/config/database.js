
    const { Pool } = require('pg');
    const logger = require('../ultils/logger');

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);


    

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // BẮT BUỘC cho Render
  },
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT 1')
  .then(() => logger.info('✅ PostgreSQL connected'))
  .catch(err => {
    logger.error('❌ Database connection failed', err);
    process.exit(1);
  });

    const query = async (text,params)=>{
        const start = Date.now();
        try{
            const res  = await pool.query(text,params)
            const duration = Date.now() - start;
            logger.info('executed query', {text, duration, rows: res.rowCount});
            return res;
        }catch(err){
            logger.error('Error executing query', err);
            throw err;
        }
    }

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};



module.exports = {
  pool,
  query,
  transaction
};