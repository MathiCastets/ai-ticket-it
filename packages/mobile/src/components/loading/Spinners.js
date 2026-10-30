import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme/colors';

function DualOrbitSpinner({ size = 42 }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const reverseRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const forward = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const reverse = Animated.loop(
      Animated.timing(reverseRotation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    forward.start();
    reverse.start();
    return () => {
      forward.stop();
      reverse.stop();
    };
  }, [rotation, reverseRotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const reverseSpin = reverseRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View style={[styles.orbitContainer, { width: size, height: size }]}>
      <View style={[styles.orbitTrack, { borderRadius: size / 2 }]} />
      <Animated.View
        style={[
          styles.orbit,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: spin }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.innerOrbit,
          {
            width: size / 2,
            height: size / 2,
            borderRadius: size / 4,
            transform: [{ rotate: reverseSpin }],
          },
        ]}
      />
    </View>
  );
}

function BouncingDots() {
  const firstDot = useRef(new Animated.Value(0)).current;
  const secondDot = useRef(new Animated.Value(0)).current;
  const thirdDot = useRef(new Animated.Value(0)).current;
  const dots = [firstDot, secondDot, thirdDot];

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 180),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 180),
        ])
      )
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [firstDot, secondDot, thirdDot]);

  return (
    <View style={styles.dotsContainer}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            index === 1 && styles.cyanDot,
            {
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [
                { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function IndeterminateBar() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-130, 260],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

export default function LoadingSpinner({
  variant = 'dual',
  label,
  size = 42,
  style,
}) {
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label || 'Cargando'}
    >
      {variant === 'dots' ? (
        <BouncingDots />
      ) : variant === 'progress' ? (
        <IndeterminateBar />
      ) : (
        <DualOrbitSpinner size={size} />
      )}
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  orbitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitTrack: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 127, 0.18)',
  },
  orbit: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: COLORS.accentElectric,
    borderRightColor: COLORS.tertiary,
  },
  innerOrbit: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderBottomColor: COLORS.primaryContainer,
  },
  dotsContainer: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentElectric,
  },
  cyanDot: {
    backgroundColor: COLORS.tertiary,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  progressFill: {
    width: '45%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.tertiary,
  },
});
