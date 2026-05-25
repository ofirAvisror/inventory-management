import type { ImageDropzoneValue } from "../components/ImageDropzone";
import {
  ProductStatus,
  type ProductStatusValue,
  type PublicProduct,
} from "../types";

export type StatusGaps = {
  needsCustomer: boolean;
  needsImage: boolean;
};

export type ProductSupplement = {
  customerId: string;
  image: ImageDropzoneValue;
};

export type StatusChangeSubmitPayload = {
  status: ProductStatusValue;
  reason?: string;
  supplements: Record<string, ProductSupplement>;
};

export function emptySupplement(): ProductSupplement {
  return { customerId: "", image: { file: null, url: null } };
}

export function getStatusGaps(
  product: Pick<PublicProduct, "customerId" | "imageUrl">,
  targetStatus: ProductStatusValue,
): StatusGaps {
  return {
    needsCustomer:
      targetStatus >= ProductStatus.AssignedToCustomer && !product.customerId,
    needsImage:
      targetStatus >= ProductStatus.ReadyForDelivery && !product.imageUrl,
  };
}

export function hasAnyGap(gaps: StatusGaps): boolean {
  return gaps.needsCustomer || gaps.needsImage;
}

export function isGapFilled(
  gaps: StatusGaps,
  supplement: ProductSupplement,
): boolean {
  if (gaps.needsCustomer && supplement.customerId.trim().length === 0) {
    return false;
  }
  if (gaps.needsImage) {
    const hasImage =
      Boolean(supplement.image.url?.trim()) || Boolean(supplement.image.file);
    if (!hasImage) return false;
  }
  return true;
}

export function isDemotionBlocked(
  products: PublicProduct[],
  targetStatus: ProductStatusValue,
  isEffectiveAdmin: boolean,
): boolean {
  if (isEffectiveAdmin) return false;
  return products.some(
    (p) =>
      p.status === ProductStatus.Delivered &&
      targetStatus < ProductStatus.Delivered,
  );
}

export function countProductsNeedingDetails(
  products: PublicProduct[],
  targetStatus: ProductStatusValue,
): number {
  return products.filter((p) => hasAnyGap(getStatusGaps(p, targetStatus)))
    .length;
}

export function countIncompleteProducts(
  products: PublicProduct[],
  targetStatus: ProductStatusValue,
  supplements: Record<string, ProductSupplement>,
): number {
  let incomplete = 0;
  for (const product of products) {
    const gaps = getStatusGaps(product, targetStatus);
    if (!hasAnyGap(gaps)) continue;
    const supplement = supplements[product.id] ?? emptySupplement();
    if (!isGapFilled(gaps, supplement)) incomplete++;
  }
  return incomplete;
}

export function canSubmitStatusChange(input: {
  products: PublicProduct[];
  targetStatus: ProductStatusValue;
  supplements: Record<string, ProductSupplement>;
  isNoChange: boolean;
  demotionBlocked: boolean;
}): boolean {
  const { products, targetStatus, supplements, isNoChange, demotionBlocked } =
    input;
  if (isNoChange || demotionBlocked) return false;
  return countIncompleteProducts(products, targetStatus, supplements) === 0;
}

export function buildInitialSupplements(
  products: PublicProduct[],
  targetStatus: ProductStatusValue,
): Record<string, ProductSupplement> {
  const out: Record<string, ProductSupplement> = {};
  for (const product of products) {
    const gaps = getStatusGaps(product, targetStatus);
    if (!hasAnyGap(gaps)) continue;
    out[product.id] = {
      customerId: product.customerId ?? "",
      image: { file: null, url: product.imageUrl },
    };
  }
  return out;
}
