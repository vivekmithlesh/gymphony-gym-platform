/** Zod-validated environment configuration for server-side code. */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  MSG91_API_KEY: z.string().min(1),
  MSG91_TEMPLATE_ID: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().positive(),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const invalidVariableNames = [
    ...new Set(
      parsedEnv.error.issues.map((issue) => {
        const variableName = issue.path[0];
        return typeof variableName === "string" ? variableName : "UNKNOWN_ENV_VARIABLE";
      }),
    ),
  ];

  throw new Error(`Invalid or missing environment variables: ${invalidVariableNames.join(", ")}`);
}

/** Typed and validated environment configuration object. */
export const env = Object.freeze(parsedEnv.data);

/** Type of the validated environment configuration object. */
export type AppEnv = typeof env;
