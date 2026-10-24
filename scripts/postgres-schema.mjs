import { readFileSync, writeFileSync } from 'node:fs';
const schema = readFileSync('prisma/schema.prisma', 'utf8');
writeFileSync('prisma/postgresql.prisma', schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
console.log('Generated PostgreSQL schema from shared models. Existing data is not migrated.');
