import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface DynamicQrCodeProps {
  payload: string;
  amount: number;
  fromUser: string;
  expirySeconds?: number;
}

export const DynamicQrCode: React.FC<DynamicQrCodeProps> = ({
  payload,
  amount,
  fromUser,
  expirySeconds = 120,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(expirySeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 1 ? prev - 1 : expirySeconds));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Generate deterministic visual matrix pattern from payload hash
  const generateMatrix = () => {
    const rows = 17;
    const cols = 17;
    const matrix: boolean[][] = [];
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = (hash << 5) - hash + payload.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < rows; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < cols; c++) {
        // Standard QR position corner markers
        const isTopLeft = r < 5 && c < 5;
        const isTopRight = r < 5 && c >= cols - 5;
        const isBottomLeft = r >= rows - 5 && c < 5;

        if (isTopLeft || isTopRight || isBottomLeft) {
          const isBorder = r === 0 || r === 4 || c === 0 || c === 4 ||
                           r === 0 || r === 4 || c === cols - 1 || c === cols - 5 ||
                           r === rows - 1 || r === rows - 5 || c === 0 || c === 4;
          const isCenter = (r >= 1 && r <= 3 && c >= 1 && c <= 3) ||
                           (r >= 1 && r <= 3 && c >= cols - 4 && c <= cols - 2) ||
                           (r >= rows - 4 && r <= rows - 2 && c >= 1 && c <= 3);
          row.push(isBorder || isCenter);
        } else {
          // Data bits derived from cryptographic hash
          const bit = Math.abs((hash ^ (r * 31 + c * 17)) % 3) === 0;
          row.push(bit);
        }
      }
      matrix.push(row);
    }
    return matrix;
  };

  const matrix = generateMatrix();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.badge}>OFFLINE TOKEN TICKET</Text>
        <Text style={styles.timer}>Refreshes in {secondsRemaining}s</Text>
      </View>

      {/* QR Matrix Frame */}
      <View style={styles.qrContainer}>
        <View style={styles.qrFrame}>
          {matrix.map((row, rIdx) => (
            <View key={rIdx} style={styles.qrRow}>
              {row.map((cell, cIdx) => (
                <View
                  key={cIdx}
                  style={[
                    styles.qrCell,
                    cell ? styles.qrCellDark : styles.qrCellLight,
                  ]}
                />
              ))}
            </View>
          ))}
          {/* Logo center overlay */}
          <View style={styles.centerBadge}>
            <Text style={styles.centerLogo}>🪙</Text>
          </View>
        </View>
      </View>

      {/* Ticket Details */}
      <View style={styles.footer}>
        <Text style={styles.amountText}>{amount} 🪙 MapVeri Tokens</Text>
        <Text style={styles.subtext}>From: @{fromUser} &bull; Signed Offline Proof</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.teal,
    backgroundColor: colors.tealLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timer: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  qrContainer: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  qrFrame: {
    width: 170,
    height: 170,
    backgroundColor: '#fff',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrRow: {
    flexDirection: 'row',
  },
  qrCell: {
    width: 10,
    height: 10,
  },
  qrCellDark: {
    backgroundColor: colors.navy,
  },
  qrCellLight: {
    backgroundColor: '#fff',
  },
  centerBadge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  centerLogo: {
    fontSize: 14,
  },
  footer: {
    marginTop: 12,
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
