
require("dotenv").config();

const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,

  options: {
    encrypt: true,
    trustServerCertificate: true,
    ...(process.env.DB_INSTANCE
      ? { instanceName: process.env.DB_INSTANCE }
      : {})
  },

  connectionTimeout: 10000
};

async function testConnection() {
  try {
    const pool = await sql.connect(config);

    console.log("✅ Connected to SQL Server!");

    const result = await pool.request().query(`
      SELECT
        DB_NAME() AS DatabaseName,
        1 AS TestValue
    `);

    console.log(result.recordset);

  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error.message);

  } finally {
    await sql.close();
  }
}

testConnection();
