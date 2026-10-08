import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

type ShareInfo = { fileName: string; title: string; text: string };

/**
 * Shares a captured image.
 * - iOS/Android: the native share sheet via expo-sharing (file URI), or React Native's Share.
 * - Web: the Web Share API with the image as a file when the browser supports it, otherwise the
 *   image is downloaded.
 */
export async function shareImage(uri: string, info: ShareInfo): Promise<ShareOutcome> {
  if (Platform.OS === 'web') return shareImageOnWeb(uri, info);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: info.title });
    return 'shared';
  }
  const result = await Share.share({ url: uri, message: info.text, title: info.title });
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
}

/** Text-only share (used when the image can't be made). Resolves false if nothing could be shared. */
export async function shareText(info: Omit<ShareInfo, 'fileName'>): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator | undefined;
      if (!nav?.share) return false;
      await nav.share({ title: info.title, text: info.text });
      return true;
    }
    await Share.share({ message: info.text, title: info.title });
    return true;
  } catch {
    return false;
  }
}

async function shareImageOnWeb(dataUri: string, info: ShareInfo): Promise<ShareOutcome> {
  const blob = await (await fetch(dataUri)).blob();
  const nav = globalThis.navigator as Navigator | undefined;
  if (nav?.share && typeof File !== 'undefined') {
    const file = new File([blob], info.fileName, { type: 'image/png' });
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: info.title, text: info.text });
        return 'shared';
      } catch (error) {
        if ((error as Error | undefined)?.name === 'AbortError') return 'cancelled';
        // Share refused (e.g. not allowed here): fall back to downloading the image.
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = info.fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
