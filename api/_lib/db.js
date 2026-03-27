const { neon } = require('@neondatabase/serverless');

var cachedSql = null;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  if (!cachedSql) {
    cachedSql = neon(process.env.DATABASE_URL);
  }
  return cachedSql;
}

module.exports = { getDb };
