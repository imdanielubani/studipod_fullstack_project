import "dotenv/config";
import { Client } from "pg";

/** Removes registrations created by the e2e suite (reserved test domain only). */
export default async function globalTeardown(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://studipod:studipod_local_dev@localhost:5433/studipod?schema=public";
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query("DELETE FROM waitlist_entries WHERE email LIKE $1", ["%@e2e.studipod.test"]);
  } finally {
    await client.end();
  }
}
