import { OfflineTokenTicket } from '../types';

export interface BlePeer {
  id: string;
  name: string;
  rssi: number; // Signal strength in dBm (-35 is touching/very close, -80 is far)
  isProximityTouch: boolean;
}

type BleEventCallback = (event: {
  type: 'peers_discovered' | 'peer_connected' | 'transfer_success' | 'error';
  peers?: BlePeer[];
  ticket?: OfflineTokenTicket;
  message?: string;
}) => void;

class BluetoothExchangeService {
  private isScanning = false;
  private isAdvertising = false;
  private callback: BleEventCallback | null = null;
  private activeTicket: OfflineTokenTicket | null = null;

  startAdvertising(ticket: OfflineTokenTicket, callback: BleEventCallback) {
    this.isAdvertising = true;
    this.activeTicket = ticket;
    this.callback = callback;
  }

  startScanning(callback: BleEventCallback) {
    this.isScanning = true;
    this.callback = callback;

    // Simulate discovering neighboring MapVeri mobile devices
    setTimeout(() => {
      this.callback?.({
        type: 'peers_discovered',
        peers: [
          {
            id: 'BLE-PEER-8821',
            name: "Madhukanth's Phone",
            rssi: -38, // High proximity (< 10cm)
            isProximityTouch: true,
          },
          {
            id: 'BLE-PEER-4490',
            name: "Maitreya's Phone",
            rssi: -65,
            isProximityTouch: false,
          },
        ],
      });
    }, 800);
  }

  triggerProximityBeamTransfer(targetPeerId: string, ticket?: OfflineTokenTicket) {
    if (!this.callback) return;

    this.callback({
      type: 'peer_connected',
      message: `Connected via BLE to ${targetPeerId}. Exchanging offline token payload...`,
    });

    setTimeout(() => {
      this.callback?.({
        type: 'transfer_success',
        ticket: ticket || this.activeTicket || {
          protocol: 'MAPVERI-P2P-v1',
          txId: `TX-BLE-${Date.now().toString().slice(-6)}`,
          from: 'PeerSender',
          to: 'Me',
          amount: 10,
          timestamp: Date.now(),
          nonce: Math.floor(100 + Math.random() * 900),
          signature: 'SIG_BLE_BEAM_33918a',
          checksum: '33918a00',
        },
        message: 'Bluetooth Low Energy offline transfer confirmed!',
      });
    }, 1000);
  }

  stop() {
    this.isScanning = false;
    this.isAdvertising = false;
    this.activeTicket = null;
    this.callback = null;
  }
}

export const BluetoothService = new BluetoothExchangeService();
