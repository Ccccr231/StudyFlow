import { existsSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) copyFileSync('.env.example', '.env');
const env = readFileSync('.env', 'utf8');
if (!/^MODEL_ENCRYPTION_KEY\s*=\s*["']?[a-fA-F0-9]{64}["']?\s*$/m.test(env)) {
  writeFileSync('.env', env.replace(/^MODEL_ENCRYPTION_KEY=.*(?:\r?\n|$)/gm, '') + `\nMODEL_ENCRYPTION_KEY="${randomBytes(32).toString('hex')}"\n`);
}
if (!existsSync('prisma/studyflow.db')) writeFileSync('prisma/studyflow.db', '');
