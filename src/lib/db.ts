// src/lib/db.ts
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a connection pool (reuses connections efficiently)
const pool = new pg.Pool({ connectionString });

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

/**
 * Prisma Client Singleton
 * 
 * Why a singleton? In development, Next.js hot-reloads files, which can
 * create multiple Prisma instances and exhaust the database connection pool.
 * This pattern ensures we only ever have ONE instance of PrismaClient.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}