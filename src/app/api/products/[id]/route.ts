// src/app/api/dashboard/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireBusinessOwner } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { sanitizeHtmlServer } from '@/lib/sanitize-backend';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBusinessOwner();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error('Fetch product error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(10000).optional().nullable(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBusinessOwner();
    const { id } = await params;
    const formData = await request.formData();

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const productDataRaw = formData.get('data');
    if (!productDataRaw || typeof productDataRaw !== 'string') {
      return NextResponse.json(
        { error: 'Product data is required' },
        { status: 400 }
      );
    }

    let productData;
    try {
      productData = JSON.parse(productDataRaw);
    } catch {
      return NextResponse.json(
        { error: 'Invalid product data format' },
        { status: 400 }
      );
    }

    const validation = updateProductSchema.safeParse(productData);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, price, stock, status } = validation.data;

    const updateData: Prisma.ProductUpdateInput = {
      name,
      price,
      stock,
      status,
      description: description ? sanitizeHtmlServer(description) : null,
    };

    const files: File[] = [];
    formData.getAll('files').forEach((file) => {
      if (file instanceof File) {
        files.push(file);
      }
    });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}` },
          { status: 400 }
        );
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large: ${file.name}` },
          { status: 400 }
        );
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: updateData,
      });

      if (files.length > 0) {
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        const uploadDir = join(process.cwd(), 'public', 'uploads', 'images');
        await mkdir(uploadDir, { recursive: true });

        const imageUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 8);
          const fileExtension = file.name.split('.').pop() || 'jpg';
          const fileName = `${timestamp}-${randomString}-${i}.${fileExtension}`;
          const filePath = join(uploadDir, fileName);

          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          await writeFile(filePath, buffer);

          imageUrls.push(`/uploads/images/${fileName}`);
        }

        await tx.productImage.createMany({
          data: imageUrls.map((url, index) => ({
            productId: id,
            url,
            order: index,
          })),
        });
      }

      return await tx.product.findUnique({
        where: { id },
        include: {
          images: { orderBy: { order: 'asc' } },
        },
      });
    });

    return NextResponse.json(
      { message: 'Product updated successfully', product: updatedProduct },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireBusinessOwner();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json(
      { message: 'Product archived successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Archive product error:', error);
    return NextResponse.json(
      { error: 'Failed to archive product' },
      { status: 500 }
    );
  }
}