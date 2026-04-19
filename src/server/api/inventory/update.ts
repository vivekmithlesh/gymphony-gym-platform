import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { updateProduct } from "@/server/services/inventory.service";

const updateInventorySchema = z.object({
  productId: z.number().int().positive(),
  name: z.string().min(2).optional(),
  price: z.number().int().nonnegative().optional(),
  category: z.enum(["Drink", "Gear", "PT"]).optional(),
  icon: z.string().min(1).optional(),
  stock: z.number().int().nonnegative().optional(),
  showInApp: z.boolean().optional(),
});

export const inventoryUpdate = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .inputValidator(updateInventorySchema)
  .handler(async ({ context, data }) => {
    return updateProduct(data.productId, context.session.gymId, data);
  });
