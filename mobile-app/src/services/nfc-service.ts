import { OfflineTokenTicket } from '../types';

export interface NfcSession {
  role: 'sender' | 'receiver';
  active: boolean;
  ticket?: OfflineTokenTicket;
  targetAmount?: number;
}

type NfcEventCallback = (event: {
  type: 'touch_detected' | 'handshake_complete' | 'transfer_success' | 'cancelled' | 'error';
  ticket?: OfflineTokenTicket;
  message?: string;
}) => void;

class NfcExchangeService {
  private isListening = false;
  private currentRole: 'sender' | 'receiver' | null = null;
  private callback: NfcEventCallback | null = null;
  private activeTicket: OfflineTokenTicket | null = null;

  /**
   * Check if NFC hardware is available on the device
   */
  async isNfcSupported(): Promise<boolean> {
    // In React Native with react-native-nfc-manager, this queries NfcManager.isSupported()
    return true;
  }

  /**
   * Receiver: Starts listening for an incoming sender phone touch
   */
  startListeningForIncomingTap(callback: NfcEventCallback) {
    this.isListening = true;
    this.currentRole = 'receiver';
    this.callback = callback;
    this.activeTicket = null;
  }

  /**
   * Sender: Prepares NFC emitter with signed token ticket waiting for receiver touch
   */
  startEmittingForOutgoingTap(ticket: OfflineTokenTicket, callback: NfcEventCallback) {
    this.isListening = true;
    this.currentRole = 'sender';
    this.activeTicket = ticket;
    this.callback = callback;
  }

  /**
   * Stops any ongoing NFC session
   */
  stopSession() {
    this.isListening = false;
    this.currentRole = null;
    this.activeTicket = null;
    this.callback = null;
  }

  /**
   * Simulates or triggers the physical phone contact touch event.
   * In a real device with NFC, this is invoked by NdefMessage / TagDiscovered events.
   */
  simulatePhoneTouchContact(providedTicket?: OfflineTokenTicket) {
    if (!this.callback) return;

    // 1. Touch contact detected (devices in proximity < 4cm)
    this.callback({
      type: 'touch_detected',
      message: 'Physical phone contact detected via NFC field!',
    });

    // 2. Cryptographic peer handshake after 600ms
    setTimeout(() => {
      this.callback?.({
        type: 'handshake_complete',
        message: 'Cryptographic handshake verified between devices',
      });

      // 3. Complete token ticket transfer after 1100ms
      setTimeout(() => {
        const payloadTicket = providedTicket || this.activeTicket || {
          protocol: 'MAPVERI-P2P-v1',
          txId: `TX-NFC-${Date.now().toString().slice(-6)}`,
          from: 'PeerSender',
          to: 'Me',
          amount: 10,
          timestamp: Date.now(),
          nonce: Math.floor(100 + Math.random() * 900),
          signature: 'SIG_NFC_TAP_883011bfa',
          checksum: '883011bf',
        };

        this.callback?.({
          type: 'transfer_success',
          ticket: payloadTicket,
          message: 'Offline NFC tap transfer complete!',
        });
      }, 700);
    }, 600);
  }
}

export const NfcService = new NfcExchangeService();
