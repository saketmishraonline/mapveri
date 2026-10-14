import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme/colors';

interface PhoneTouchAnimationProps {
  statusText?: string;
  isTouchDetected?: boolean;
}

export const PhoneTouchAnimation: React.FC<PhoneTouchAnimationProps> = ({
  statusText = 'Touch phones back-to-back',
  isTouchDetected = false,
}) => {
  const leftPhoneAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Oscillate phones approaching each other
    Animated.loop(
      Animated.sequence([
        Animated.timing(leftPhoneAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(leftPhoneAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse wave between phones
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [leftPhoneAnim, waveAnim]);

  const leftPhoneTranslate = leftPhoneAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-26, -4],
  });

  const rightPhoneTranslate = leftPhoneAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 4],
  });

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 2.2],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.9, 0.4, 0],
  });

  return (
    <View style={styles.container}>
      {/* Central NFC Energy Ring Waves */}
      <View style={styles.waveCenter}>
        <Animated.View
          style={[
            styles.waveCircle,
            {
              transform: [{ scale: waveScale }],
              opacity: waveOpacity,
              borderColor: isTouchDetected ? colors.success : colors.saffron,
            },
          ]}
        />
        {isTouchDetected && (
          <View style={[styles.contactFlash, { backgroundColor: colors.success }]} />
        )}
      </View>

      {/* Two Phones Coming Together */}
      <View style={styles.phonesRow}>
        {/* Left Phone (Sender) */}
        <Animated.View
          style={[
            styles.phoneCard,
            styles.phoneLeft,
            { transform: [{ translateX: leftPhoneTranslate }] },
          ]}
        >
          <View style={styles.phoneScreen}>
            <View style={styles.phoneCamera} />
            <Text style={styles.phoneLabel}>SENDER</Text>
            <View style={styles.phoneNfcChip}>
              <Text style={styles.nfcIcon}>⚡</Text>
            </View>
          </View>
        </Animated.View>

        {/* Right Phone (Receiver) */}
        <Animated.View
          style={[
            styles.phoneCard,
            styles.phoneRight,
            { transform: [{ translateX: rightPhoneTranslate }] },
          ]}
        >
          <View style={styles.phoneScreen}>
            <View style={styles.phoneCamera} />
            <Text style={styles.phoneLabel}>RECEIVER</Text>
            <View style={[styles.phoneNfcChip, { borderColor: colors.teal }]}>
              <Text style={styles.nfcIcon}>🪙</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Status Instruction */}
      <View style={styles.labelContainer}>
        <Text style={[styles.statusTitle, isTouchDetected && { color: colors.success }]}>
          {isTouchDetected ? '⚡ CONTACT DETECTED!' : statusText}
        </Text>
        <Text style={styles.statusSubtitle}>
          {isTouchDetected
            ? 'Cryptographic handshake in progress. Keep phones touching.'
            : 'Hold phones within 4 cm of each other to transfer tokens.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    overflow: 'hidden',
  },
  waveCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    zIndex: 1,
  },
  waveCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    position: 'absolute',
  },
  contactFlash: {
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.8,
  },
  phonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    zIndex: 2,
  },
  phoneCard: {
    width: 72,
    height: 124,
    borderRadius: 14,
    backgroundColor: colors.navyDark,
    borderWidth: 2,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  phoneLeft: {
    borderColor: colors.saffron,
  },
  phoneRight: {
    borderColor: colors.teal,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.navyLight,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  phoneCamera: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a141b',
  },
  phoneLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  phoneNfcChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.saffron,
    backgroundColor: 'rgba(241, 199, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcIcon: {
    fontSize: 14,
  },
  labelContainer: {
    marginTop: 18,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.saffron,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statusSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
