import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { createProduct } from "@/server/services/inventory.service";

const createInventorySchema = z.object({
  name: z.string().min(2),
  price: z.number().int().nonnegative(),
  category: z.enum(["Drink", "Gear", "PT"]),
  icon: z.string().min(1),
  stock: z.number().int().nonnegative(),
});

export const inventoryCreate = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .inputValidator(createInventorySchema)
  .handler(async ({ context, data }) => {
    return createProduct(context.session.gymId, data);
  });
