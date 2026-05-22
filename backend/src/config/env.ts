import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return value.toLowerCase() === "true";
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  SECRET_KEY: z.string().min(32, "SECRET_KEY must be at least 32 chars"),
  ALGORITHM: z.literal("HS256").default("HS256"),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(30),
  REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().int().positive().default(1),
  ACCESS_TOKEN_COOKIE_NAME: z.string().min(1).default("access_token"),
  COOKIE_SECURE: booleanFromString.default(false),

  ADMIN_HEADER_NAME: z.string().min(1).default("x-admin-role"),
  ADMIN_HEADER_VALUE: z
    .string()
    .min(16, "ADMIN_HEADER_VALUE must be at least 16 chars"),

  EMAIL_VERIFICATION_EXPIRE_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 24),
  PASSWORD_RESET_EXPIRE_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(60),

  FRONTEND_PUBLIC_URL: z
    .string()
    .url("FRONTEND_PUBLIC_URL must be a valid URL")
    .default("http://localhost:5173"),
  FRONTEND_URLS: z.string().min(1).default("http://localhost:5173"),

  MAIL_SERVER: z.string().min(1, "MAIL_SERVER is required"),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_USE_TLS: booleanFromString.default(true),
  MAIL_USE_SSL: booleanFromString.default(false),
  MAIL_USERNAME: z.string().min(1, "MAIL_USERNAME is required"),
  MAIL_PASSWORD: z.string().min(1, "MAIL_PASSWORD is required"),
  MAIL_FROM: z.string().email("MAIL_FROM must be a valid email"),
  MAIL_FROM_NAME: z.string().min(1).default("Guru Inventory Management"),

  RATE_LIMIT_REQUESTS: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_PERIOD: z.coerce.number().int().positive().default(60),

  SLACK_ALERTS_ENABLED: booleanFromString.default(false),
  SLACK_WEBHOOK_URL_NEW_USERS: z
    .string()
    .url("SLACK_WEBHOOK_URL_NEW_USERS must be a valid URL")
    .optional(),
  SLACK_WEBHOOK_URL_ALERTS_SECURITY: z
    .string()
    .url("SLACK_WEBHOOK_URL_ALERTS_SECURITY must be a valid URL")
    .optional(),
  SLACK_WEBHOOK_URL_INVENTORY_STATUS_OPS: z
    .string()
    .url("SLACK_WEBHOOK_URL_INVENTORY_STATUS_OPS must be a valid URL")
    .optional(),
  SLACK_WEBHOOK_URL_INVENTORY_BULK_ACTIONS: z
    .string()
    .url("SLACK_WEBHOOK_URL_INVENTORY_BULK_ACTIONS must be a valid URL")
    .optional(),
  SLACK_WEBHOOK_URL_INVENTORY_AUDIT_OVERRIDE: z
    .string()
    .url("SLACK_WEBHOOK_URL_INVENTORY_AUDIT_OVERRIDE must be a valid URL")
    .optional(),
  LOGIN_FAIL_THRESHOLD: z.coerce.number().int().positive().default(5),
  LOGIN_FAIL_WINDOW_MINUTES: z.coerce.number().int().positive().default(60),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, "CLOUDINARY_API_SECRET is required"),
  CLOUDINARY_UPLOAD_FOLDER: z
    .string()
    .min(1)
    .default("guru-inventory/products"),
  CLOUDINARY_UPLOAD_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  FRONTEND_ORIGINS: raw.FRONTEND_URLS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ADMIN_HEADER_NAME_LOWER: raw.ADMIN_HEADER_NAME.toLowerCase(),
} as const;

export type Env = typeof env;
