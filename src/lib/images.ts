import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Lets the user pick a photo and returns a URI that stays valid offline:
 * - iOS/Android: the picked file is copied into the app's document directory (images/).
 * - Web: there is no app sandbox, so the image is kept as a data: URI.
 * Returns null when the user cancels.
 */
export async function pickLocalImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.7,
    base64: Platform.OS === 'web',
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  if (Platform.OS === 'web') {
    return asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
  }

  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const extension = asset.uri.split('?')[0].split('.').pop() || 'jpg';
  const destination = new File(dir, `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`);
  await new File(asset.uri).copy(destination);
  return destination.uri;
}
