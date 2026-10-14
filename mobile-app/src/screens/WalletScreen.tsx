import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { OfflineTokenVault } from '../services/offline-token-vault';
import { WalletState } from '../types';

export const WalletScreen: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>(OfflineTokenVault.getState());
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'nfc_tap' | 'bluetooth_ble' | 'offline_qr'>('all');

  useEffect(() => {
    return OfflineTokenVault.subscribe(setWallet);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await OfflineTokenVault.syncOfflineQueue();
    setSyncing(false);
  };

  const filteredTx = wallet.transactions.filter(
    (t) => filter === 'all' || t.channel === filter
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Vault Header */}
        <View style={styles.vaultHeader}>
          <Text style={styles.vaultEyebrow}>MAPVERI OFFLINE VAULT</Text>
          <Text style={styles.balanceBig}>{wallet.tokenBalance}</Text>
          <Text style={styles.balanceLabel}>🪙 Reward Tokens Available</Text>

          {/* Sync status button */}
          <View style={styles.syncContainer}>
            {wallet.pendingSyncCount > 0 ? (
              <TouchableOpacity
                style={styles.syncButtonPending}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.syncButtonText}>
                    ⚡ Sync {wallet.pendingSyncCount} Offline Txs to Cloud
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.syncedPill}>
                <Text style={styles.syncedText}>✓ All Offline Transactions Synced</Text>
              </View>
            )}
          </View>
        </View>

        {/* Earning Rules Card */}
        <View style={styles.earningCard}>
          <Text style={styles.earningTitle}>How You Earn Tokens in MapVeri</Text>
          <View style={styles.earningRow}>
            <Text style={styles.earningIcon}>📍</Text>
            <View style={styles.earningTextGroup}>
              <Text style={styles.earningHead}>Add a New Place Pin</Text>
              <Text style={styles.earningSub}>Earn +10 🪙 per approved community pin</Text>
            </View>
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningIcon}>✓</Text>
            <View style={styles.earningTextGroup}>
              <Text style={styles.earningHead}>Verify Nearby Place</Text>
              <Text style={styles.earningSub}>Earn +1 🪙 per verified field note check</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>P2P Transfer History</Text>
            <Text style={styles.historyCount}>{wallet.transactions.length} records</Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {[
              { id: 'all', label: 'All' },
              { id: 'nfc_tap', label: '⚡ NFC' },
              { id: 'bluetooth_ble', label: '📡 BLE' },
              { id: 'offline_qr', label: '📷 QR' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterChip, filter === tab.id && styles.filterChipActive]}
                onPress={() => setFilter(tab.id as any)}
              >
                <Text style={[styles.filterChipText, filter === tab.id && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transaction Items */}
          <View style={styles.txList}>
            {filteredTx.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No transfers in this category yet.</Text>
              </View>
            ) : (
              filteredTx.map((tx) => {
                const isOutgoing = tx.fromUser === wallet.user.username;
                return (
                  <View key={tx.txId} style={styles.txItem}>
                    <View style={styles.txLeft}>
                      <View
                        style={[
                          styles.txIconCircle,
                          isOutgoing ? styles.txCircleSend : styles.txCircleReceive,
                        ]}
                      >
                        <Text style={styles.txIconText}>{isOutgoing ? '↗' : '↙'}</Text>
                      </View>
                      <View>
                        <Text style={styles.txUser}>
                          {isOutgoing ? `Sent to @${tx.toUser}` : `From @${tx.fromUser}`}
                        </Text>
                        <Text style={styles.txMeta}>
                          {tx.channel === 'nfc_tap'
                            ? '⚡ NFC Tap'
                            : tx.channel === 'bluetooth_ble'
                            ? '📡 BLE Beam'
                            : '📷 QR Scan'}{' '}
                          &bull; Block #{tx.blockIndex}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          isOutgoing ? styles.txAmountNegative : styles.txAmountPositive,
                        ]}
                      >
                        {isOutgoing ? `-${tx.amount}` : `+${tx.amount}`} 🪙
                      </Text>
                      <Text
                        style={[
                          styles.txSyncStatus,
                          tx.syncStatus === 'synced' ? { color: colors.teal } : { color: colors.amber },
                        ]}
                      >
                        {tx.syncStatus === 'synced' ? 'Synced' : 'Offline Vault'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
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
  vaultHeader: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  vaultEyebrow: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.textMuted,
  },
  balanceBig: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.saffron,
    marginTop: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  syncContainer: {
    marginTop: 14,
  },
  syncButtonPending: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  syncedPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  syncedText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '700',
  },
  earningCard: {
    backgroundColor: colors.parchmentCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    marginTop: 12,
  },
  earningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  earningIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  earningTextGroup: {
    flex: 1,
  },
  earningHead: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  earningSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  historySection: {
    marginTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyCount: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.saffron,
    fontWeight: '800',
  },
  txList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    overflow: 'hidden',
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1eb',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCircleSend: {
    backgroundColor: '#fee2e2',
  },
  txCircleReceive: {
    backgroundColor: '#daf0e3',
  },
  txIconText: {
    fontSize: 16,
    fontWeight: '900',
  },
  txUser: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  txMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountPositive: {
    color: colors.tealDark,
  },
  txAmountNegative: {
    color: colors.coral,
  },
  txSyncStatus: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginTop: 2,
  },
});
