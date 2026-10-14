import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { OfflineTokenVault } from '../services/offline-token-vault';
import { NfcService } from '../services/nfc-service';
import { BluetoothService, BlePeer } from '../services/bluetooth-service';
import { QrCryptoService } from '../services/qr-crypto-service';
import { PhoneTouchAnimation } from '../components/PhoneTouchAnimation';
import { NfcRadarAnimation } from '../components/NfcRadarAnimation';
import { DynamicQrCode } from '../components/DynamicQrCode';
import { OfflineStatusBanner } from '../components/OfflineStatusBanner';
import {
  OfflineTokenTicket,
  OfflineTokenTransaction,
  TransferChannel,
  NfcTradeRole,
  NfcTouchState,
} from '../types';

export const NfcTradeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [wallet, setWallet] = useState(OfflineTokenVault.getState());
  const [role, setRole] = useState<NfcTradeRole>(null);
  const [channel, setChannel] = useState<TransferChannel>('nfc_tap');
  const [sendAmount, setSendAmount] = useState<string>('15');
  const [recipientNote, setRecipientNote] = useState<string>('Nearby Contributor');
  const [touchState, setTouchState] = useState<NfcTouchState>('idle');
  const [activeTicket, setActiveTicket] = useState<OfflineTokenTicket | null>(null);
  const [completedTx, setCompletedTx] = useState<OfflineTokenTransaction | null>(null);
  const [discoveredPeers, setDiscoveredPeers] = useState<BlePeer[]>([]);

  useEffect(() => {
    const unsubscribe = OfflineTokenVault.subscribe(setWallet);
    return () => unsubscribe();
  }, []);

  // Reset state when switching roles
  const handleSelectRole = (newRole: NfcTradeRole) => {
    setRole(newRole);
    setTouchState('idle');
    setActiveTicket(null);
    setCompletedTx(null);
    NfcService.stopSession();
    BluetoothService.stop();
  };

  // ==========================================
  // SENDER ACTIONS
  // ==========================================
  const handleStartSend = () => {
    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid token amount.');
      return;
    }
    if (amt > wallet.tokenBalance) {
      Alert.alert('Insufficient Balance', `You only have ${wallet.tokenBalance} 🪙 tokens available.`);
      return;
    }

    try {
      // 1. Generate cryptographically signed offline token ticket
      const ticket = OfflineTokenVault.createOfflineTicket(amt, recipientNote || 'Peer Phone');
      setActiveTicket(ticket);
      setTouchState('listening_nfc');

      if (channel === 'nfc_tap') {
        NfcService.startEmittingForOutgoingTap(ticket, (event) => {
          if (event.type === 'touch_detected') {
            setTouchState('touch_contact_detected');
          } else if (event.type === 'handshake_complete') {
            setTouchState('cryptographic_handshake');
          } else if (event.type === 'transfer_success') {
            // Commit token deduction from sender's vault
            const tx = OfflineTokenVault.commitSentTicket(ticket, 'nfc_tap');
            setCompletedTx(tx);
            setTouchState('transfer_confirmed');
          }
        });
      } else if (channel === 'bluetooth_ble') {
        BluetoothService.startAdvertising(ticket, (event) => {
          if (event.type === 'transfer_success') {
            const tx = OfflineTokenVault.commitSentTicket(ticket, 'bluetooth_ble');
            setCompletedTx(tx);
            setTouchState('transfer_confirmed');
          }
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ==========================================
  // RECEIVER ACTIONS
  // ==========================================
  const handleStartReceive = () => {
    setTouchState('listening_nfc');
    setCompletedTx(null);

    if (channel === 'nfc_tap') {
      NfcService.startListeningForIncomingTap((event) => {
        if (event.type === 'touch_detected') {
          setTouchState('touch_contact_detected');
        } else if (event.type === 'handshake_complete') {
          setTouchState('cryptographic_handshake');
        } else if (event.type === 'transfer_success' && event.ticket) {
          try {
            // Credit tokens to receiver vault
            const tx = OfflineTokenVault.processReceivedTicket(event.ticket, 'nfc_tap');
            setCompletedTx(tx);
            setTouchState('transfer_confirmed');
          } catch (err: any) {
            Alert.alert('Verification Failed', err.message);
            setTouchState('error');
          }
        }
      });
    } else if (channel === 'bluetooth_ble') {
      BluetoothService.startScanning((event) => {
        if (event.type === 'peers_discovered' && event.peers) {
          setDiscoveredPeers(event.peers);
        } else if (event.type === 'transfer_success' && event.ticket) {
          const tx = OfflineTokenVault.processReceivedTicket(event.ticket, 'bluetooth_ble');
          setCompletedTx(tx);
          setTouchState('transfer_confirmed');
        }
      });
    }
  };

  // Trigger Phone Touch (Simulate back-to-back phone tap)
  const handleTriggerPhoneContact = () => {
    if (role === 'sender' && activeTicket) {
      NfcService.simulatePhoneTouchContact(activeTicket);
    } else if (role === 'receiver') {
      // Simulate incoming transfer of 15 tokens from peer
      const incomingTicket: OfflineTokenTicket = {
        protocol: 'MAPVERI-P2P-v1',
        txId: `TX-NFC-${Date.now().toString().slice(-6)}`,
        from: 'PeerSender',
        to: wallet.user.username,
        amount: parseFloat(sendAmount) || 15,
        timestamp: Date.now(),
        nonce: Math.floor(100 + Math.random() * 900),
        signature: 'SIG_ECDSA_PEER_TOUCH_991b',
        checksum: '883011bf', // will match processed signature
      };
      // Auto-compute valid checksum
      let hash = 0;
      const raw = `${incomingTicket.txId}:${incomingTicket.from}:${incomingTicket.to}:${incomingTicket.amount}:${incomingTicket.timestamp}:${incomingTicket.nonce}:${incomingTicket.signature}`;
      for (let i = 0; i < raw.length; i++) {
        hash = (hash << 5) - hash + raw.charCodeAt(i);
        hash |= 0;
      }
      incomingTicket.checksum = Math.abs(hash).toString(16).padStart(8, '0');

      NfcService.simulatePhoneTouchContact(incomingTicket);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Badge */}
        <View style={styles.topBar}>
          <div>
            <Text style={styles.headerTitle}>Offline Token Trade</Text>
            <Text style={styles.headerSubtitle}>Exclusive Phone-to-Phone P2P Transfer</Text>
          </div>
          <View style={styles.balancePill}>
            <Text style={styles.balanceLabel}>Vault</Text>
            <Text style={styles.balanceValue}>{wallet.tokenBalance} 🪙</Text>
          </View>
        </View>

        {/* Offline Banner */}
        <OfflineStatusBanner channel={channel === 'nfc_tap' ? 'nfc' : channel === 'bluetooth_ble' ? 'bluetooth' : 'qr'} />

        {/* Channel Switcher */}
        <View style={styles.channelContainer}>
          <TouchableOpacity
            style={[styles.channelTab, channel === 'nfc_tap' && styles.channelTabActive]}
            onPress={() => setChannel('nfc_tap')}
          >
            <Text style={[styles.channelTabText, channel === 'nfc_tap' && styles.channelTabTextActive]}>
              ⚡ NFC Phone Touch
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.channelTab, channel === 'bluetooth_ble' && styles.channelTabActive]}
            onPress={() => setChannel('bluetooth_ble')}
          >
            <Text style={[styles.channelTabText, channel === 'bluetooth_ble' && styles.channelTabTextActive]}>
              📡 Bluetooth BLE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.channelTab, channel === 'offline_qr' && styles.channelTabActive]}
            onPress={() => setChannel('offline_qr')}
          >
            <Text style={[styles.channelTabText, channel === 'offline_qr' && styles.channelTabTextActive]}>
              📷 QR Fallback
            </Text>
          </TouchableOpacity>
        </View>

        {/* Role Selector: SEND or RECEIVE */}
        <View style={styles.roleGrid}>
          <TouchableOpacity
            style={[styles.roleCard, role === 'send' && styles.roleCardActiveSend]}
            onPress={() => handleSelectRole('send')}
          >
            <View style={styles.roleIconCircleSend}>
              <Text style={styles.roleIconText}>📤</Text>
            </View>
            <Text style={[styles.roleTitle, role === 'send' && styles.roleTextActive]}>Send Tokens</Text>
            <Text style={styles.roleDesc}>Enter amount and touch phones to pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, role === 'receive' && styles.roleCardActiveReceive]}
            onPress={() => handleSelectRole('receive')}
          >
            <View style={styles.roleIconCircleReceive}>
              <Text style={styles.roleIconText}>📥</Text>
            </View>
            <Text style={[styles.roleTitle, role === 'receive' && styles.roleTextActive]}>Receive Tokens</Text>
            <Text style={styles.roleDesc}>Ready phone to accept incoming tap</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* SENDER INTERFACE */}
        {/* ============================================================ */}
        {role === 'send' && (
          <View style={styles.modeContainer}>
            {touchState === 'idle' && (
              <View style={styles.inputCard}>
                <Text style={styles.sectionTitle}>Enter Token Amount to Send</Text>

                {/* Amount Input */}
                <View style={styles.amountInputRow}>
                  <Text style={styles.tokenSymbol}>🪙</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={sendAmount}
                    onChangeText={setSendAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.tokenUnit}>Tokens</Text>
                </View>

                {/* Quick Chips */}
                <View style={styles.chipsRow}>
                  {['5', '10', '25', '50', '100'].map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.chip, sendAmount === chip && styles.chipActive]}
                      onPress={() => setSendAmount(chip)}
                    >
                      <Text style={[styles.chipText, sendAmount === chip && styles.chipTextActive]}>
                        +{chip} 🪙
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Recipient Note */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Recipient / Purpose</Text>
                  <TextInput
                    style={styles.textInput}
                    value={recipientNote}
                    onChangeText={setRecipientNote}
                    placeholder="Nearby phone peer"
                  />
                </View>

                {/* Ready to Touch Button */}
                <TouchableOpacity style={styles.primaryButton} onPress={handleStartSend}>
                  <Text style={styles.primaryButtonText}>
                    {channel === 'nfc_tap'
                      ? '⚡ Ready: Tap Phones to Transfer'
                      : channel === 'bluetooth_ble'
                      ? '📡 Broadcast via Bluetooth'
                      : '📷 Generate Offline QR Ticket'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Waiting for Phone Touch / Active NFC Emitting */}
            {(touchState === 'listening_nfc' ||
              touchState === 'touch_contact_detected' ||
              touchState === 'cryptographic_handshake') && (
              <View style={styles.activeExchangeCard}>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>Transferring: {sendAmount} 🪙 MapVeri Tokens</Text>
                </View>

                {/* Phone Touching Visualizer */}
                {channel === 'nfc_tap' && (
                  <PhoneTouchAnimation
                    statusText="TOUCH PHONES BACK-TO-BACK"
                    isTouchDetected={touchState === 'touch_contact_detected' || touchState === 'cryptographic_handshake'}
                  />
                )}

                {/* BLE Radar */}
                {channel === 'bluetooth_ble' && (
                  <View style={styles.radarWrapper}>
                    <NfcRadarAnimation color={colors.blue} size={160} />
                    <Text style={styles.radarSubtitle}>Broadcasting encrypted BLE token beacon...</Text>
                  </View>
                )}

                {/* Fallback QR Display */}
                {channel === 'offline_qr' && activeTicket && (
                  <DynamicQrCode
                    payload={QrCryptoService.encodeTicketToQrPayload(activeTicket)}
                    amount={activeTicket.amount}
                    fromUser={activeTicket.from}
                  />
                )}

                {/* Simulation Contact Button for Testing */}
                <TouchableOpacity style={styles.touchTriggerButton} onPress={handleTriggerPhoneContact}>
                  <Text style={styles.touchTriggerText}>📲 Touch Phone / Simulate NFC Tap</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setTouchState('idle');
                    NfcService.stopSession();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel Transfer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Transfer Confirmed */}
            {touchState === 'transfer_confirmed' && completedTx && (
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Text style={styles.successIconText}>✓</Text>
                </View>
                <Text style={styles.successTitle}>Transfer Successful!</Text>
                <Text style={styles.successSubtitle}>
                  Sent {completedTx.amount} 🪙 to @{completedTx.toUser}
                </Text>

                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Transaction ID:</Text>
                    <Text style={styles.receiptValue}>{completedTx.txId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Channel:</Text>
                    <Text style={styles.receiptValue}>{completedTx.channel.toUpperCase()}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Status:</Text>
                    <Text style={[styles.receiptValue, { color: colors.teal }]}>Stored in Offline Vault</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Signature Proof:</Text>
                    <Text style={styles.receiptValue}>{completedTx.signature.slice(0, 18)}...</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={() => setTouchState('idle')}>
                  <Text style={styles.primaryButtonText}>Make Another Transfer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* RECEIVER INTERFACE */}
        {/* ============================================================ */}
        {role === 'receive' && (
          <View style={styles.modeContainer}>
            {touchState === 'idle' && (
              <View style={styles.receiverReadyCard}>
                <View style={styles.radarWrapper}>
                  <NfcRadarAnimation color={colors.teal} size={150} />
                  <Text style={styles.receiverInstructions}>
                    Tap &lsquo;Listen for Sender Touch&rsquo; below, then hold the back of your phone to the sender&rsquo;s phone.
                  </Text>
                </View>

                <TouchableOpacity style={styles.tealButton} onPress={handleStartReceive}>
                  <Text style={styles.tealButtonText}>⚡ Listen for Sender Phone Touch</Text>
                </TouchableOpacity>
              </View>
            )}

            {(touchState === 'listening_nfc' ||
              touchState === 'touch_contact_detected' ||
              touchState === 'cryptographic_handshake') && (
              <View style={styles.activeExchangeCard}>
                <View style={styles.listeningBadge}>
                  <Text style={styles.listeningBadgeText}>READY TO RECEIVE TOKENS</Text>
                </View>

                {channel === 'nfc_tap' && (
                  <PhoneTouchAnimation
                    statusText="AWAITING TOUCH FROM SENDER"
                    isTouchDetected={touchState === 'touch_contact_detected' || touchState === 'cryptographic_handshake'}
                  />
                )}

                {channel === 'bluetooth_ble' && (
                  <View style={styles.radarWrapper}>
                    <NfcRadarAnimation color={colors.blue} size={160} />
                    <Text style={styles.radarSubtitle}>Scanning for peer devices nearby...</Text>
                    {discoveredPeers.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.peerChip}
                        onPress={() => BluetoothService.triggerProximityBeamTransfer(p.id)}
                      >
                        <Text style={styles.peerChipText}>Pair with {p.name} ({p.rssi} dBm)</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Fallback QR Receiver */}
                {channel === 'offline_qr' && (
                  <View style={styles.qrFallbackBox}>
                    <Text style={styles.qrFallbackTitle}>Scan Sender&rsquo;s Offline QR Ticket</Text>
                    <Text style={styles.qrFallbackSub}>Position sender&rsquo;s screen in front of your camera.</Text>
                    <TouchableOpacity style={styles.touchTriggerButton} onPress={handleTriggerPhoneContact}>
                      <Text style={styles.touchTriggerText}>📷 Scan Sample QR Ticket</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Simulate Phone Touch Button */}
                <TouchableOpacity style={styles.touchTriggerButton} onPress={handleTriggerPhoneContact}>
                  <Text style={styles.touchTriggerText}>📲 Touch Phone / Simulate NFC Tap</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setTouchState('idle');
                    NfcService.stopSession();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Stop Listening</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Receiver Confirmed */}
            {touchState === 'transfer_confirmed' && completedTx && (
              <View style={styles.successCard}>
                <View style={[styles.successIconCircle, { backgroundColor: colors.teal }]}>
                  <Text style={styles.successIconText}>🪙</Text>
                </View>
                <Text style={styles.successTitle}>Tokens Received!</Text>
                <Text style={styles.successSubtitle}>
                  +{completedTx.amount} 🪙 credited to your local vault
                </Text>

                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>From Sender:</Text>
                    <Text style={styles.receiptValue}>@{completedTx.fromUser}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Transaction ID:</Text>
                    <Text style={styles.receiptValue}>{completedTx.txId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Channel Proof:</Text>
                    <Text style={styles.receiptValue}>Offline NFC Cryptographic Signature Verified</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={() => setTouchState('idle')}>
                  <Text style={styles.primaryButtonText}>Ready for Next Tap</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balancePill: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.saffron,
  },
  channelContainer: {
    flexDirection: 'row',
    backgroundColor: '#e7ede6',
    borderRadius: 12,
    padding: 3,
    marginVertical: 10,
  },
  channelTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  channelTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  channelTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  channelTabTextActive: {
    color: colors.navy,
    fontWeight: '800',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  roleCard: {
    flex: 1,
    backgroundColor: colors.parchmentCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    alignItems: 'center',
  },
  roleCardActiveSend: {
    borderColor: colors.saffron,
    backgroundColor: '#fffdf4',
  },
  roleCardActiveReceive: {
    borderColor: colors.teal,
    backgroundColor: '#f2f8f4',
  },
  roleIconCircleSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(241, 199, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleIconCircleReceive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45, 107, 96, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleIconText: {
    fontSize: 20,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  roleTextActive: {
    color: colors.navy,
  },
  roleDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  modeContainer: {
    marginTop: 10,
  },
  inputCard: {
    backgroundColor: colors.parchmentCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tokenSymbol: {
    fontSize: 24,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    padding: 0,
  },
  tokenUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
  },
  chipActive: {
    backgroundColor: colors.saffron,
    borderColor: colors.saffron,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.navy,
  },
  inputGroup: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: colors.saffron,
    fontSize: 14,
    fontWeight: '800',
  },
  tealButton: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  tealButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  activeExchangeCard: {
    backgroundColor: colors.navyDark,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  amountBadge: {
    backgroundColor: colors.navyLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.saffron,
    marginBottom: 10,
  },
  amountBadgeText: {
    color: colors.saffron,
    fontSize: 12,
    fontWeight: '800',
  },
  listeningBadge: {
    backgroundColor: colors.navyLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.teal,
    marginBottom: 10,
  },
  listeningBadgeText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  radarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  radarSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
  receiverInstructions: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  receiverReadyCard: {
    backgroundColor: colors.parchmentCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    alignItems: 'center',
  },
  touchTriggerButton: {
    backgroundColor: colors.saffron,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  touchTriggerText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  cancelButton: {
    paddingVertical: 10,
    marginTop: 6,
  },
  cancelButtonText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successIconText: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  successSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  receiptBox: {
    backgroundColor: colors.parchment,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  receiptLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  qrFallbackBox: {
    padding: 16,
    backgroundColor: colors.navyLight,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  qrFallbackTitle: {
    color: colors.saffron,
    fontSize: 13,
    fontWeight: '800',
  },
  qrFallbackSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  peerChip: {
    backgroundColor: colors.navyLight,
    borderWidth: 1,
    borderColor: colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  peerChipText: {
    color: '#bae6fd',
    fontSize: 11,
    fontWeight: '600',
  },
});
