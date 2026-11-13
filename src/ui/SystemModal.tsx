import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, Panel } from './kit';
import { C } from './theme';

export function SystemModal({
  visible,
  onClose,
  title,
  icon,
  color = C.cyan,
  children,
  width = 480,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  color?: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.box, { maxWidth: width }]}>
          <Panel
            title={title}
            icon={icon}
            color={color}
            intensity={1.4}
            style={{ marginBottom: 0, backgroundColor: 'rgba(4, 12, 28, 0.97)' }}
            right={
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="close" size={20} color={C.textDim} />
              </Pressable>
            }>
            <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Panel>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0, 3, 10, 0.78)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  box: { width: '100%' },
});
