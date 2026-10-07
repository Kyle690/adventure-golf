import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme';

type Props = {
  visible: boolean;
  courseName: string;
  onClose: () => void;
  onSaveAndExit: () => void;
  onQuit: () => void;
};

/** "Round options" bottom sheet with the quit confirmation step (prototype .round-menu). */
export function RoundMenu({ visible, courseName, onClose, onSaveAndExit, onQuit }: Props) {
  const insets = useSafeAreaInsets();
  const [confirmQuit, setConfirmQuit] = useState(false);
  const close = () => {
    setConfirmQuit(false);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable accessibilityLabel="Close round options" style={styles.backdrop} onPress={close}>
        <Pressable
          accessibilityViewIsModal
          onPress={(e) => e.stopPropagation()}
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom) }]}
        >
          <View style={styles.handle} />
          {!confirmQuit ? (
            <>
              <View style={styles.heading}>
                <Eyebrow style={{ marginBottom: 6, color: colors.green }}>LIVE ROUND</Eyebrow>
                <Text style={styles.title}>Round options</Text>
                <Text style={styles.copy}>Your scores are automatically saved as you play.</Text>
              </View>
              <MenuAction
                icon="home"
                title="Save & exit"
                subtitle="Continue this round from the home screen"
                onPress={() => {
                  close();
                  onSaveAndExit();
                }}
              />
              <MenuAction
                danger
                icon="trash"
                title="Quit round"
                subtitle="Delete this unfinished game"
                onPress={() => setConfirmQuit(true)}
              />
              <Pressable style={styles.cancel} onPress={close}>
                <Text style={styles.cancelText}>Keep playing</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.confirm}>
              <View style={styles.quitIcon}>
                <Icon name="flag" size={26} color={colors.red} />
              </View>
              <Eyebrow style={{ marginTop: 13, marginBottom: 6, color: colors.red, textAlign: 'center' }}>ARE YOU SURE?</Eyebrow>
              <Text style={styles.title}>Quit this round?</Text>
              <Text style={[styles.copy, styles.confirmCopy]}>
                All scores from {courseName} will be removed. This action can&apos;t be undone.
              </Text>
              <Pressable
                style={[styles.cancel, styles.confirmQuit]}
                onPress={() => {
                  setConfirmQuit(false);
                  onQuit();
                }}
              >
                <Text style={[styles.cancelText, { color: '#fff' }]}>Yes, quit round</Text>
              </Pressable>
              <Pressable style={styles.cancel} onPress={() => setConfirmQuit(false)}>
                <Text style={styles.cancelText}>No, keep playing</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuAction({
  icon,
  title,
  subtitle,
  danger,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.action, danger && styles.actionDanger]} onPress={onPress}>
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
        <Icon name={icon} size={19} color={danger ? colors.red : colors.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, danger && { color: '#b9142e' }]}>{title}</Text>
        <Text style={styles.actionSub}>{subtitle}</Text>
      </View>
      <Icon name="chevron" size={17} color="#9ca7a1" />
    </Pressable>
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
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: colors.cream,
    boxShadow: '0 -12px 40px rgba(3, 35, 38, 0.28)',
  },
  handle: {
    alignSelf: 'center',
    width: 35,
    height: 4,
    marginBottom: 17,
    borderRadius: 4,
    backgroundColor: '#c7cec5',
  },
  heading: { marginBottom: 17, alignItems: 'center' },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 23, textAlign: 'center' },
  copy: { marginTop: 5, color: '#7c8c84', fontSize: 11, lineHeight: 16, textAlign: 'center', fontFamily: fonts.body },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dce3d9',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  actionDanger: { borderColor: '#f0d8d8', backgroundColor: '#fffafa' },
  actionIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#e8f2e2',
  },
  actionIconDanger: { backgroundColor: '#ffe8e8' },
  actionTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 14 },
  actionSub: { marginTop: 2, color: '#849189', fontSize: 9, fontFamily: fonts.body },
  cancel: { marginTop: 13, padding: 13, alignItems: 'center', borderRadius: 12, backgroundColor: '#e6ebe3' },
  cancelText: { color: colors.ink, fontSize: 11, fontFamily: fonts.bodyBold },
  confirm: { paddingTop: 4, paddingHorizontal: 3, alignItems: 'stretch' },
  quitIcon: {
    alignSelf: 'center',
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#ffe3e6',
  },
  confirmCopy: { alignSelf: 'center', maxWidth: 320, marginTop: 8, marginBottom: 19 },
  confirmQuit: { marginTop: 0, backgroundColor: colors.red },
});
