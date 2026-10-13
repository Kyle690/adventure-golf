/**
 * RevenueCat "Remove ads" (one-off, non-consumable). Web uses purchases.web.ts. Every call degrades
 * to "unavailable" instead of throwing when the API key is missing or the store can't be reached.
 */
import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { REVENUECAT } from '@/lib/ads-config';

const apiKey = Platform.OS === 'ios' ? REVENUECAT.iosKey : Platform.OS === 'android' ? REVENUECAT.androidKey : undefined;
let configured = false;

export const purchasesAvailable = () => Boolean(apiKey);

const hasEntitlement = (info: CustomerInfo) => Boolean(info.entitlements.active[REVENUECAT.entitlement]);

/** Configure once. Returns false when there is no key (purchases show as unavailable). */
export function configurePurchases(onChange: (adFree: boolean) => void): boolean {
  if (!apiKey) return false;
  if (!configured) {
    try {
      Purchases.configure({ apiKey });
      configured = true;
      Purchases.addCustomerInfoUpdateListener((info) => onChange(hasEntitlement(info)));
    } catch {
      return false;
    }
  }
  return configured;
}

/** Entitlement from RevenueCat, or null if it couldn't be checked (offline, not configured). */
export async function fetchAdFree(): Promise<boolean | null> {
  if (!configured) return null;
  try {
    return hasEntitlement(await Purchases.getCustomerInfo());
  } catch {
    return null;
  }
}

async function findPackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[REVENUECAT.offering] ?? offerings.current;
  if (!offering) return null;
  return (
    offering.availablePackages.find((p) => p.product.identifier === REVENUECAT.productId) ??
    offering.lifetime ??
    offering.availablePackages[0] ??
    null
  );
}

export type RemoveAdsProduct = { price: string; title: string };

export async function getRemoveAdsProduct(): Promise<RemoveAdsProduct | null> {
  if (!configured) return null;
  try {
    const pkg = await findPackage();
    return pkg ? { price: pkg.product.priceString, title: pkg.product.title } : null;
  } catch {
    return null;
  }
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'not-entitled' | 'unavailable' | 'error';

export async function buyRemoveAds(): Promise<PurchaseResult> {
  if (!configured) return 'unavailable';
  try {
    const pkg = await findPackage();
    if (!pkg) return 'unavailable';
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasEntitlement(customerInfo) ? 'purchased' : 'not-entitled';
  } catch (e) {
    const err = e as { userCancelled?: boolean; code?: string };
    if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    return 'error';
  }
}

export async function restoreRemoveAds(): Promise<PurchaseResult> {
  if (!configured) return 'unavailable';
  try {
    return hasEntitlement(await Purchases.restorePurchases()) ? 'purchased' : 'not-entitled';
  } catch {
    return 'error';
  }
}
