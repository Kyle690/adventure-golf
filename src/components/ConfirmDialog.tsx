import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

/**
 * Destructive confirmation bottom sheet, styled like the prototype's "Quit this round?" step.
 * (RN's Alert has no buttons on web, so this works everywhere.)
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon = 'trash',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={onCancel}>
        <Pressable
          accessibilityViewIsModal
          accessibilityRole="alert"
          onPress={(e) => e.stopPropagation()}
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom) }]}
        >
          <View style={styles.handle} />
          <View style={styles.icon}>
            <Icon name={icon} size={26} color={colors.red} />
          </View>
          <Eyebrow style={{ marginTop: 13, marginBottom: 6, color: colors.red, textAlign: 'center' }}>ARE YOU SURE?</Eyebrow>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.copy}>{message}</Text>
          <Pressable style={[styles.button, styles.confirm]} onPress={onConfirm}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>{confirmLabel}</Text>
          </Pressable>
          <Pressable style={[styles.button, { marginTop: 13 }]} onPress={onCancel}>
            <Text style={styles.buttonText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(2, 30, 32, 0.62)',
  },
  sheet: {
    width: '100%',
    maxWidth: 442,
    paddingTop: 10,
    paddingHorizontal: 21,
    borderRadius: 25,
    backgroundColor: colors.cream,
    boxShadow: '0 -12px 40px rgba(3, 35, 38, 0.28)',
  },
  handle: {
    alignSelf: 'center',
    width: 35,
    height: 4,
    marginBottom: 21,
    borderRadius: 4,
    backgroundColor: '#c7cec5',
  },
  icon: {
    alignSelf: 'center',
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#ffe3e6',
  },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, textAlign: 'center' },
  copy: {
    alignSelf: 'center',
    maxWidth: 320,
    marginTop: 8,
    marginBottom: 19,
    color: '#7c8c84',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  button: { padding: 13, alignItems: 'center', borderRadius: 12, backgroundColor: '#e6ebe3' },
  confirm: { backgroundColor: colors.red },
  buttonText: { color: colors.ink, fontSize: 11, fontFamily: fonts.bodyBold },
});
