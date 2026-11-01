-- Run this once in the Neon SQL Editor. Creates the table that stores all accounts.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,   -- always stored in lowercase
  password_hash TEXT         NOT NULL,          -- bcrypt hash, never the real password
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
