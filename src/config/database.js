
    const { Pool } = require('pg');
    const logger = require('../ultils/logger');



    const pool = new Pool({
        host : process.env.DB_HOST,
        user : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_NAME,
        port : process.env.DB_PORT,
        min:parseFloat(process.env.DB_POOL_MIN) || 2,
        max:parseFloat(process.env.DB_POOL_MAX) || 10,
        idleTimeoutMillis:30000,
        connectionTimeoutMillis:2000,
    })

    pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
        process.exit(-1);
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