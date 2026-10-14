export type TransferChannel = 'nfc_tap' | 'bluetooth_ble' | 'offline_qr';

export type SyncStatus = 'completed' | 'pending_sync' | 'synced' | 'failed';

export interface OfflineTokenTransaction {
  txId: string;
  fromUser: string;
  fromAddress: string;
  toUser: string;
  toAddress: string;
  amount: number;
  timestamp: number;
  nonce: number;
  signature: string;
  channel: TransferChannel;
  syncStatus: SyncStatus;
  note?: string;
  blockIndex?: number;
}

export interface OfflineTokenTicket {
  protocol: 'MAPVERI-P2P-v1';
  txId: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  nonce: number;
  signature: string;
  checksum: string;
}

export interface WalletState {
  tokenBalance: number;
  user: {
    id: number;
    username: string;
    name: string;
    level: string;
    address: string;
  };
  transactions: OfflineTokenTransaction[];
  pendingSyncCount: number;
}

export type NfcTradeRole = 'sender' | 'receiver' | null;

export type NfcTouchState =
  | 'idle'
  | 'listening_nfc'
  | 'touch_contact_detected'
  | 'cryptographic_handshake'
  | 'transfer_confirmed'
  | 'fallback_qr'
  | 'fallback_ble'
  | 'error';
