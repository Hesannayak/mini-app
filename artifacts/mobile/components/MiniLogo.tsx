import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';

interface MiniLogoProps {
  size?: number;
  spinning?: boolean;
}

export default function MiniLogo({ size = 32, spinning = false }: MiniLogoProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (spinning) {
      rotation.setValue(0);
      animRef.current = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        }),
      );
      animRef.current.start();
    } else {
      if (animRef.current) { animRef.current.stop(); animRef.current = null; }
      rotation.setValue(0);
    }
    return () => { if (animRef.current) { animRef.current.stop(); animRef.current = null; } };
  }, [spinning, rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.Image
      source={require('../assets/images/mini-logo.png')}
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        spinning ? { transform: [{ rotate: spin }] } : undefined,
      ]}
      resizeMode="contain"
    />
  );
}
