/** Web: no RevenueCat. "Remove ads" shows as unavailable. */
export const purchasesAvailable = () => false;
export const configurePurchases = (_onChange: (adFree: boolean) => void) => false;
export const fetchAdFree = async (): Promise<boolean | null> => null;
export type RemoveAdsProduct = { price: string; title: string };
export const getRemoveAdsProduct = async (): Promise<RemoveAdsProduct | null> => null;
export type PurchaseResult = 'purchased' | 'cancelled' | 'not-entitled' | 'unavailable' | 'error';
export const buyRemoveAds = async (): Promise<PurchaseResult> => 'unavailable';
export const restoreRemoveAds = async (): Promise<PurchaseResult> => 'unavailable';
