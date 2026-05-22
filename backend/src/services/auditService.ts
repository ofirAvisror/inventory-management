import { Types, type ClientSession } from "mongoose";
import { AuditLog } from "../models/AuditLog.js";
import type { ProductStatusValue } from "../types/product.js";

export interface AuditEntryInput {
  productId: Types.ObjectId | string;
  fromStatus: ProductStatusValue | null;
  toStatus: ProductStatusValue;
  actor: "admin" | "user";
  actorUserId?: string | null;
  reason?: string | null;
}

export interface PublicAuditEntry {
  id: string;
  productId: string;
  fromStatus: number | null;
  toStatus: number;
  actor: "admin" | "user";
  actorUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

// Works for both hydrated docs (where `.id` is a virtual) and lean POJOs
// (where only `_id` is present). Without this fallback, `id` would silently
// be `undefined` in API responses returned via `listAuditForProduct`.
interface AuditLogShape {
  _id?: Types.ObjectId | string;
  id?: string;
  productId: Types.ObjectId | string;
  fromStatus: number | null | undefined;
  toStatus: number;
  actor: string;
  actorUserId?: Types.ObjectId | string | null;
  reason?: string | null;
  createdAt: Date;
}

function toPublic(entry: AuditLogShape): PublicAuditEntry {
  const id =
    entry.id ??
    (entry._id ? entry._id.toString() : undefined);

  if (!id) {
    throw new Error("AuditLog entry is missing an id");
  }

  return {
    id,
    productId: entry.productId.toString(),
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus,
    actor: entry.actor as "admin" | "user",
    actorUserId: entry.actorUserId ? entry.actorUserId.toString() : null,
    reason: entry.reason ?? null,
    createdAt: entry.createdAt,
  };
}

export async function writeAuditEntry(
  input: AuditEntryInput,
  session?: ClientSession
): Promise<PublicAuditEntry> {
  const created = await AuditLog.create(
    [
      {
        productId:
          typeof input.productId === "string"
            ? new Types.ObjectId(input.productId)
            : input.productId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actor: input.actor,
        actorUserId:
          input.actorUserId && Types.ObjectId.isValid(input.actorUserId)
            ? new Types.ObjectId(input.actorUserId)
            : null,
        reason: input.reason ?? null,
      },
    ],
    session ? { session } : undefined
  );

  return toPublic(created[0] as unknown as AuditLogShape);
}

export async function listAuditForProduct(
  productId: string
): Promise<PublicAuditEntry[]> {
  const entries = await AuditLog.find({
    productId: new Types.ObjectId(productId),
  })
    .sort({ createdAt: -1 })
    .lean<AuditLogShape[]>();

  return entries.map((entry) => toPublic(entry));
}
