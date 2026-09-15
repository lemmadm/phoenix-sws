import app from '../server';
import { initDatabase } from '../server/db';

// Vercel serverless entry — re-exports Express app.
// `server.ts` skips `listen()` when VERCEL=1, so we init DB here on first cold start.
let dbReady = false;
async function ensureDb() {
  if (!dbReady) {
    try {
      await initDatabase();
      dbReady = true;
    } catch (e) {
      console.error('[api/index] initDatabase failed', e);
    }
  }
}

export default async function handler(req: any, res: any) {
  await ensureDb();
  return (app as any)(req, res);
}
