import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface OfflineStatusBannerProps {
  channel?: 'nfc' | 'bluetooth' | 'qr';
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({ channel = 'nfc' }) => {
  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <View style={styles.pulseDot} />
        <Text style={styles.title}>100% OFFLINE PEER EXCHANGE</Text>
      </View>
      <Text style={styles.detail}>
        {channel === 'nfc'
          ? 'NFC Antenna Active &bull; Zero Data/Cellular Used'
          : channel === 'bluetooth'
          ? 'BLE Proximity Beam &bull; Local Radio'
          : 'Visual Cryptographic QR &bull; Camera Fallback'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginVertical: 6,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  title: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.8,
  },
  detail: {
    fontSize: 10,
    color: '#15803d',
    marginTop: 2,
    fontWeight: '500',
  },
});
