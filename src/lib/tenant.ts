// src/lib/tenant.ts
import { prisma } from './db';
import type { AuthenticatedUser } from './auth';

/**
 * This function ensures a user can only access their own tenant's data.
 * 
 * @param user - The authenticated user
 * @param requestedTenantId - The tenantId from the request (URL param, body, etc.)
 * @returns The validated tenantId (guaranteed to belong to the user)
 * @throws Response with 403 if the user tries to access another tenant's data
 */
export function validateTenantAccess(
  user: AuthenticatedUser,
  requestedTenantId: string
): string {
  // BUSINESS_OWNER can only access their own tenant
  if (user.role === 'BUSINESS_OWNER') {
    if (user.tenantId !== requestedTenantId) {
      throw new Response(
        JSON.stringify({ error: 'Forbidden: You can only access your own store data' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return user.tenantId;
  }

  // CUSTOMER can access any tenant's public data (storefront)
  // but cannot perform write operations on other tenants
  return requestedTenantId;
}

/**
 * Gets the tenant for a business owner.
 * Throws if the tenant doesn't exist or doesn't belong to the user.
 */
export async function getOwnerTenant(user: AuthenticatedUser) {
  if (user.role !== 'BUSINESS_OWNER' || !user.tenantId) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: Business owner access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
  });

  if (!tenant) {
    throw new Response(
      JSON.stringify({ error: 'Tenant not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return tenant;
}

/**
 * Gets a public storefront by slug (for customers browsing).
 * Does NOT require authentication.
 */
export async function getPublicStorefront(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!tenant) {
    throw new Response(
      JSON.stringify({ error: 'Store not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return tenant;
}