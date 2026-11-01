
import pool from "./db.js";

async function testConnection() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_user AS connected_user,
        NOW() AS current_time,
        1 AS test_value
    `);

    console.log("Connected to Neon PostgreSQL!");
    console.table(result.rows);

  } catch (error) {
    console.error("Database connection failed!");
    console.error(error.message);

  } finally {
    await pool.end();
  }
}

testConnection();
