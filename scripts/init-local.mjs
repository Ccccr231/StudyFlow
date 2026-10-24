import { existsSync, writeFileSync, copyFileSync } from 'node:fs';
if (!existsSync('.env')) copyFileSync('.env.example', '.env');
if (!existsSync('prisma/studyflow.db')) writeFileSync('prisma/studyflow.db', '');
