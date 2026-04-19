import { InventoryCategory, InventoryStockStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import type { CreateProductInput, ProductRow, UpdateProductInput } from "@/types/gym.types";

function getStockStatus(stock: number): InventoryStockStatus {
  if (stock === 0) {
    return InventoryStockStatus.OUT_OF_STOCK;
  }

  if (stock <= 5) {
    return InventoryStockStatus.LOW_STOCK;
  }

  return InventoryStockStatus.IN_STOCK;
}

function mapProductStatus(status: InventoryStockStatus): ProductRow["status"] {
  switch (status) {
    case InventoryStockStatus.OUT_OF_STOCK:
      return "Out of Stock";
    case InventoryStockStatus.LOW_STOCK:
      return "Low Stock";
    case InventoryStockStatus.IN_STOCK:
    default:
      return "In Stock";
  }
}

function toProductRow(product: {
  id: number;
  name: string;
  category: InventoryCategory;
  price: number;
  stock: number;
  status: InventoryStockStatus;
  showInApp: boolean;
  icon: string;
}): ProductRow {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    status: mapProductStatus(product.status),
    showInApp: product.showInApp,
    icon: product.icon,
  };
}

/**
 * Returns all products for a gym
 */
export async function getInventory(gymId: string): Promise<ProductRow[]> {
  const products = await prisma.inventoryProduct.findMany({
    where: {
      gymId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      status: true,
      showInApp: true,
      icon: true,
    },
  });

  return products.map(toProductRow);
}

/**
 * Creates a new product
 */
export async function createProduct(gymId: string, input: CreateProductInput): Promise<ProductRow> {
  const product = await prisma.inventoryProduct.create({
    data: {
      gymId,
      name: input.name,
      price: input.price,
      category: input.category,
      icon: input.icon,
      stock: input.stock,
      status: getStockStatus(input.stock),
      showInApp: true,
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      status: true,
      showInApp: true,
      icon: true,
    },
  });

  return toProductRow(product);
}

/**
 * Updates a product
 */
export async function updateProduct(
  productId: number,
  gymId: string,
  input: UpdateProductInput,
): Promise<ProductRow> {
  const existingProduct = await prisma.inventoryProduct.findFirst({
    where: {
      id: productId,
      gymId,
    },
    select: {
      id: true,
      stock: true,
    },
  });

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  const nextStock = input.stock ?? existingProduct.stock;
  const product = await prisma.inventoryProduct.update({
    where: {
      id: productId,
    },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.showInApp !== undefined ? { showInApp: input.showInApp } : {}),
      status: getStockStatus(nextStock),
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      status: true,
      showInApp: true,
      icon: true,
    },
  });

  return toProductRow(product);
}
