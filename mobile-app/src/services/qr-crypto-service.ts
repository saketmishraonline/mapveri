import { OfflineTokenTicket } from '../types';

export const QrCryptoService = {
  /**
   * Compresses an offline token ticket into a QR-friendly URI string
   */
  encodeTicketToQrPayload(ticket: OfflineTokenTicket): string {
    const compactObj = {
      p: ticket.protocol,
      i: ticket.txId,
      f: ticket.from,
      t: ticket.to,
      a: ticket.amount,
      ts: ticket.timestamp,
      n: ticket.nonce,
      s: ticket.signature,
      c: ticket.checksum,
    };
    return `mapveri://pay?ticket=${encodeURIComponent(JSON.stringify(compactObj))}`;
  },

  /**
   * Decodes a scanned QR URI into an OfflineTokenTicket
   */
  decodeQrPayloadToTicket(qrText: string): OfflineTokenTicket {
    if (!qrText.startsWith('mapveri://pay?ticket=')) {
      throw new Error('Unrecognized QR format. Please scan a valid MapVeri Token QR.');
    }
    const raw = decodeURIComponent(qrText.replace('mapveri://pay?ticket=', ''));
    const compact = JSON.parse(raw);

    return {
      protocol: compact.p || 'MAPVERI-P2P-v1',
      txId: compact.i,
      from: compact.f,
      to: compact.t,
      amount: Number(compact.a),
      timestamp: Number(compact.ts),
      nonce: Number(compact.n),
      signature: compact.s,
      checksum: compact.c,
    };
  },
};
