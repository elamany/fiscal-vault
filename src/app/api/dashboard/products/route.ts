import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireBusinessOwner } from '@/lib/auth';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { sanitizeHtmlServer } from '@/lib/sanitize-backend';

const querySchema = z.object({
  skip: z.coerce.number().min(0).default(0),
  take: z.coerce.number().min(1).max(50).default(20),
  stockFilter: z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).default('ALL'),
  statusFilter: z.enum(['ALL', 'DRAFT', 'ACTIVE', 'ARCHIVED']).default('ALL'),
  search: z.string().optional(),
});

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(10000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireBusinessOwner();
    const { searchParams } = new URL(request.url);
    
    const validation = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { skip, take, stockFilter,statusFilter, search } = validation.data;

    const whereClause: Prisma.ProductWhereInput = { tenantId: user.tenantId };

    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }

    if (stockFilter === 'IN_STOCK') {
      whereClause.stock = { gt: 0 };
    } else if (stockFilter === 'LOW_STOCK') {
      whereClause.stock = { gt: 0, lte: 5 };
    } else if (stockFilter === 'OUT_OF_STOCK') {
      whereClause.stock = { equals: 0 };
    }

    if (statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: take + 1, 
    });

    const hasMore = products.length > take;
    const itemsToReturn = hasMore ? products.slice(0, take) : products;
    const nextSkip = hasMore ? skip + take : undefined;

    return NextResponse.json({ 
      products: itemsToReturn, 
      hasMore,
      nextSkip 
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

//  Accept multipart/form-data with files + product data
export async function POST(request: NextRequest) {
  try {
    const user = await requireBusinessOwner();
    const formData = await request.formData();

    // Extract product data from JSON string
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

    const validation = createProductSchema.safeParse(productData);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, price, stock, status } = validation.data;

    // Extract all image files
    const files: File[] = [];
    formData.getAll('files').forEach((file) => {
      if (file instanceof File) {
        files.push(file);
      }
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one product image is required' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 images allowed' },
        { status: 400 }
      );
    }

    // Validate each file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only JPEG, PNG, WebP, and GIF are allowed.` },
          { status: 400 }
        );
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 5MB.` },
          { status: 400 }
        );
      }
    }

    // Create uploads directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'images');
    await mkdir(uploadDir, { recursive: true });

    const sanitizedDescription = description ? sanitizeHtmlServer(description) : undefined;

    // Create product + upload images + create image records in ONE transaction
    const product = await prisma.$transaction(async (tx) => {
      // Create the product
      const newProduct = await tx.product.create({
        data: {
          name,
          description: sanitizedDescription,
          price,
          stock,
          status,
          tenantId: user.tenantId,
        },
      });

      // Save each file and create ProductImage records
      const imageUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}-${randomString}-${i}.${fileExtension}`;
        const filePath = join(uploadDir, fileName);

        // Save file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        imageUrls.push(`/uploads/images/${fileName}`);
      }

      // 3. Create all ProductImage records
      if (imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((url, index) => ({
            productId: newProduct.id,
            url,
            order: index,
          })),
        });
      }

      // 4. Return the complete product with images
      return await tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          images: { orderBy: { order: 'asc' } },
        },
      });
    });

    return NextResponse.json(
      { message: 'Product created successfully', product },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}