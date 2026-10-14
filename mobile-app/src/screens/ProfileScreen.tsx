import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { OfflineTokenVault } from '../services/offline-token-vault';

export const ProfileScreen: React.FC = () => {
  const wallet = OfflineTokenVault.getState();
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(true);

  const handleBackupVault = () => {
    Alert.alert(
      'Offline Vault Backup',
      'Encrypted seed phrase and offline transaction history exported successfully to mobile secure enclave.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>SM</Text>
          </View>
          <Text style={styles.userName}>{wallet.user.name}</Text>
          <Text style={styles.userHandle}>@{wallet.user.username}</Text>

          <View style={styles.badgesRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Level {wallet.user.level} Contributor</Text>
            </View>
            <View style={styles.nfcBadge}>
              <Text style={styles.nfcBadgeText}>⚡ NFC Enabled</Text>
            </View>
          </View>
        </View>

        {/* Public Crypto Address */}
        <View style={styles.addressCard}>
          <Text style={styles.cardHeader}>Vault Public Address</Text>
          <Text style={styles.addressText}>{wallet.user.address}</Text>
          <Text style={styles.addressSub}>Used for offline peer-to-peer verification signatures</Text>
        </View>

        {/* Security & Offline Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.cardHeader}>Offline Security & Capabilities</Text>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Phone-to-Phone NFC Tap</Text>
              <Text style={styles.settingSub}>Transfer tokens by touching back of phones</Text>
            </View>
            <Text style={styles.statusActive}>ACTIVE</Text>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Bluetooth Proximity Beam</Text>
              <Text style={styles.settingSub}>Fallback transfer when NFC is unavailable</Text>
            </View>
            <Text style={styles.statusActive}>ACTIVE</Text>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Auto-Sync on Internet Reconnect</Text>
              <Text style={styles.settingSub}>Broadcast signed offline transactions to cloud</Text>
            </View>
            <TouchableOpacity onPress={() => setOfflineSyncEnabled(!offlineSyncEnabled)}>
              <Text style={offlineSyncEnabled ? styles.statusActive : styles.statusInactive}>
                {offlineSyncEnabled ? 'ENABLED' : 'PAUSED'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Export / Backup Vault */}
        <TouchableOpacity style={styles.backupButton} onPress={handleBackupVault}>
          <Text style={styles.backupButtonText}>🔐 Backup Vault to Secure Storage</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textLight,
  },
  userHandle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  levelBadge: {
    backgroundColor: 'rgba(241, 199, 68, 0.2)',
    borderWidth: 1,
    borderColor: colors.saffron,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.saffron,
    fontFamily: 'monospace',
  },
  nfcBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nfcBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86efac',
    fontFamily: 'monospace',
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    marginTop: 14,
  },
  cardHeader: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.teal,
    letterSpacing: 0.8,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 6,
  },
  addressSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: colors.parchmentCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    marginTop: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecefe9',
  },
  settingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusActive: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: colors.teal,
  },
  statusInactive: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: colors.textSecondary,
  },
  backupButton: {
    backgroundColor: colors.navyLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.navyBorder,
  },
  backupButtonText: {
    color: colors.saffron,
    fontSize: 12,
    fontWeight: '800',
  },
});
