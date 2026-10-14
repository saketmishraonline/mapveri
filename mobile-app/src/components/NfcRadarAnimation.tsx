import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme/colors';

interface NfcRadarAnimationProps {
  color?: string;
  size?: number;
  isActive?: boolean;
}

export const NfcRadarAnimation: React.FC<NfcRadarAnimationProps> = ({
  color = colors.saffron,
  size = 180,
  isActive = true,
}) => {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;

    const createRingLoop = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createRingLoop(ring1, 0);
    const anim2 = createRingLoop(ring2, 700);
    const anim3 = createRingLoop(ring3, 1400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [isActive, ring1, ring2, ring3]);

  const renderRing = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 1],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.8, 0.4, 0],
    });

    return (
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {renderRing(ring1)}
      {renderRing(ring2)}
      {renderRing(ring3)}
      <View
        style={[
          styles.core,
          {
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  core: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
});
