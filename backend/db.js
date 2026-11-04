
import dotenv from "dotenv";
import ws from "ws";
import { Pool, neonConfig } from "@neondatabase/serverless";

dotenv.config();

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30000,
  max: 5
});

export default pool;
