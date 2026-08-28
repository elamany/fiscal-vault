import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireBusinessOwner } from '@/lib/auth';
import { Prisma } from '../../../../generated/prisma/client';

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().positive().optional(),
  imageUrls: z.array(z.url()).max(10).optional(),
});
/**
 * GET /api/products/:id
 * Business owner: Only if the product belongs to their tenant
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBusinessOwner();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * PATCH /api/products/:id
 * Business owner: Only if the product belongs to their tenant
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBusinessOwner();
    const { id } = await params;

    const body = await request.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { name, description, price, imageUrls } = validation.data;

    // Update product and images in a transaction
    const product = await prisma.$transaction(async (tx) => {
      // Update product fields
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price: price.toFixed(2) }),
        },
      });

      // If imageUrls provided, replace all images
      if (imageUrls !== undefined) {
        // Delete old images
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        // Create new images
        if (imageUrls.length > 0) {
          await tx.productImage.createMany({
            data: imageUrls.map((url, index) => ({
              productId: id,
              url,
              order: index,
            })),
          });
        }
      }

      // Return updated product with images
      return tx.product.findUnique({
        where: { id },
        include: {
          images: { orderBy: { order: 'asc' } },
        },
      });
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * DELETE /api/products/:id
 * Business owner: Only if the product belongs to their tenant
 * AND the product isn't referenced in any invoices (data integrity)
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBusinessOwner();
    const { id } = await params;

    const existingProduct = await prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    try {
      // onDelete: Cascade will automatically delete ProductImage records
      await prisma.product.delete({ where: { id } });
    } catch (deleteError) {
      if (
        deleteError instanceof Prisma.PrismaClientKnownRequestError &&
        deleteError.code === 'P2003'
      ) {
        return NextResponse.json(
          { error: 'Cannot delete product: it is referenced in existing invoices' },
          { status: 409 }
        );
      }
      throw deleteError;
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}