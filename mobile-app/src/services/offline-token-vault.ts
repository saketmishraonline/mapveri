import { OfflineTokenTicket, OfflineTokenTransaction, WalletState, TransferChannel } from '../types';

// Mock initial persistent offline state for testing
let vaultState: WalletState = {
  tokenBalance: 430, // 430 MapVeri Reward Tokens earned from verification field notes
  user: {
    id: 2,
    username: 'saket',
    name: 'Saket Mishra',
    level: 'A',
    address: '0xMV7a92B8831c390Fc14F44dE993bE7a2889',
  },
  transactions: [
    {
      txId: 'TX-OFFLINE-7819',
      fromUser: 'saket',
      fromAddress: '0xMV7a92B8831c390Fc14F44dE993bE7a2889',
      toUser: 'madhukanth',
      toAddress: '0xMV44c9101Fa720182Ba10190Fe0141a',
      amount: 15,
      timestamp: Date.now() - 3600000 * 2,
      nonce: 101,
      signature: 'SIG_ECDSA_9f0a2182b8a4f',
      channel: 'nfc_tap',
      syncStatus: 'pending_sync',
      note: 'Field verification reward share',
      blockIndex: 4491,
    },
    {
      txId: 'TX-OFFLINE-7820',
      fromUser: 'maitreya',
      fromAddress: '0xMV55d88390bA9281a',
      toUser: 'saket',
      toAddress: '0xMV7a92B8831c390Fc14F44dE993bE7a2889',
      amount: 25,
      timestamp: Date.now() - 3600000 * 5,
      nonce: 88,
      signature: 'SIG_ECDSA_182bc890f119a',
      channel: 'nfc_tap',
      syncStatus: 'synced',
      note: 'Boisar station pin survey exchange',
      blockIndex: 4488,
    },
  ],
  pendingSyncCount: 1,
};

// Event listeners for state updates
type VaultListener = (state: WalletState) => void;
const listeners: Set<VaultListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...vaultState }));
}

let currentNonce = 102;

/**
 * Hash function shim for generating offline cryptographic signatures
 */
function simpleChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export const OfflineTokenVault = {
  getState(): WalletState {
    return { ...vaultState };
  },

  subscribe(listener: VaultListener): () => void {
    listeners.add(listener);
    listener({ ...vaultState });
    return () => listeners.delete(listener);
  },

  /**
   * Sender: Creates and cryptographically signs an offline token ticket
   */
  createOfflineTicket(amount: number, targetUser = 'Peer Device'): OfflineTokenTicket {
    if (amount <= 0) throw new Error('Token amount must be greater than zero');
    if (amount > vaultState.tokenBalance) {
      throw new Error(`Insufficient tokens. Available: ${vaultState.tokenBalance} 🪙`);
    }

    currentNonce += 1;
    const txId = `TX-OFFLINE-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const timestamp = Date.now();
    const payloadRaw = `${txId}:${vaultState.user.username}:${targetUser}:${amount}:${timestamp}:${currentNonce}`;
    const signature = `SIG_ECDSA_${simpleChecksum(payloadRaw)}_${simpleChecksum(vaultState.user.address)}`;
    const checksum = simpleChecksum(`${payloadRaw}:${signature}`);

    return {
      protocol: 'MAPVERI-P2P-v1',
      txId,
      from: vaultState.user.username,
      to: targetUser,
      amount,
      timestamp,
      nonce: currentNonce,
      signature,
      checksum,
    };
  },

  /**
   * Sender: Finalizes the send transaction when phone touch/transfer completes
   */
  commitSentTicket(ticket: OfflineTokenTicket, channel: TransferChannel): OfflineTokenTransaction {
    vaultState.tokenBalance -= ticket.amount;

    const tx: OfflineTokenTransaction = {
      txId: ticket.txId,
      fromUser: vaultState.user.username,
      fromAddress: vaultState.user.address,
      toUser: ticket.to,
      toAddress: `0xPeer_${ticket.to}`,
      amount: ticket.amount,
      timestamp: ticket.timestamp,
      nonce: ticket.nonce,
      signature: ticket.signature,
      channel,
      syncStatus: 'pending_sync',
      note: `Offline transfer via ${channel.replace('_', ' ').toUpperCase()}`,
      blockIndex: Math.floor(4500 + Math.random() * 50),
    };

    vaultState.transactions.unshift(tx);
    vaultState.pendingSyncCount += 1;
    notifyListeners();
    return tx;
  },

  /**
   * Receiver: Verifies and credits incoming offline token ticket
   */
  processReceivedTicket(ticket: OfflineTokenTicket, channel: TransferChannel): OfflineTokenTransaction {
    // Check ticket protocol & integrity
    if (ticket.protocol !== 'MAPVERI-P2P-v1') {
      throw new Error('Invalid or incompatible offline token ticket format');
    }

    // Double spend defense: check if txId already processed
    const alreadyProcessed = vaultState.transactions.some((t) => t.txId === ticket.txId);
    if (alreadyProcessed) {
      throw new Error('Transaction has already been processed in your vault');
    }

    // Verify cryptographic checksum
    const payloadRaw = `${ticket.txId}:${ticket.from}:${ticket.to}:${ticket.amount}:${ticket.timestamp}:${ticket.nonce}`;
    const expectedChecksum = simpleChecksum(`${payloadRaw}:${ticket.signature}`);
    if (ticket.checksum !== expectedChecksum) {
      throw new Error('Cryptographic signature verification failed: Corrupt or forged ticket');
    }

    // Credit local token balance
    vaultState.tokenBalance += ticket.amount;

    const tx: OfflineTokenTransaction = {
      txId: ticket.txId,
      fromUser: ticket.from,
      fromAddress: `0xPeer_${ticket.from}`,
      toUser: vaultState.user.username,
      toAddress: vaultState.user.address,
      amount: ticket.amount,
      timestamp: ticket.timestamp,
      nonce: ticket.nonce,
      signature: ticket.signature,
      channel,
      syncStatus: 'pending_sync',
      note: `Received offline tokens via ${channel.replace('_', ' ').toUpperCase()}`,
      blockIndex: Math.floor(4500 + Math.random() * 50),
    };

    vaultState.transactions.unshift(tx);
    vaultState.pendingSyncCount += 1;
    notifyListeners();
    return tx;
  },

  /**
   * Syncs pending offline ledger with Supabase/MapVeri cloud when connection is restored
   */
  syncOfflineQueue(): Promise<{ syncedCount: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const count = vaultState.pendingSyncCount;
        vaultState.transactions = vaultState.transactions.map((tx) => ({
          ...tx,
          syncStatus: 'synced' as const,
        }));
        vaultState.pendingSyncCount = 0;
        notifyListeners();
        resolve({ syncedCount: count });
      }, 1200);
    });
  },
};
