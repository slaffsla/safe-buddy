// _Buddy.tsx — SafeBuddy character component
// Breathing animation on ambient moods, tap bounce on all moods.

import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BuddyMood, C, getBuddyImage, getBuddyLine, isAmbientMood } from './_constants';

interface BuddyProps {
  mood?: BuddyMood;
  speak: (t: string) => void;
  size?: number;
  celebrate?: boolean;
  fixed?: boolean;        // If true, Buddy stays fixed on screen (absolute positioning)
  fixedBottom?: number;   // Distance from bottom when fixed (default: 180)
  fixedTop?: number;      // Distance from top when fixed
}

export default function Buddy({ mood = 'calm', speak, size = 130, celebrate = false, fixed = false, fixedBottom, fixedTop=90}: BuddyProps) {
  const tapScale    = useRef(new Animated.Value(1)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathAnim  = useRef<Animated.CompositeAnimation | null>(null);

  const isAmbient = isAmbientMood(mood);

  useEffect(() => {
    if (isAmbient) {
      breathAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathScale, { toValue: 1.17, duration: 2800, useNativeDriver: true }),
          Animated.timing(breathScale, { toValue: 1.0,  duration: 2800, useNativeDriver: true }),
        ])
      );
      breathAnim.current.start();
    } else {
      breathAnim.current?.stop();
      breathScale.setValue(1);
    }
    return () => { breathAnim.current?.stop(); };
  }, [isAmbient]);

  useEffect(() => {
  if (!celebrate) return;
  Animated.sequence([
    Animated.timing(tapScale, { toValue: 1.2,  duration: 180, useNativeDriver: true }),
    Animated.timing(tapScale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
    Animated.timing(tapScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
    Animated.timing(tapScale, { toValue: 1.0,  duration: 250, useNativeDriver: true }),
  ]).start();
}, [celebrate]);

  function handlePress() {
    Animated.sequence([
      Animated.timing(tapScale, { toValue: 1.12, duration: 100, useNativeDriver: true }),
      Animated.timing(tapScale, { toValue: 1.0,  duration: 150, useNativeDriver: true }),
    ]).start();
    speak(getBuddyLine(mood));
  }

  const image = getBuddyImage(mood);
  const buddyContent = (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={[s.buddyWrapper]}
    >
      <Animated.View style={[s.buddyAnimated, { transform: [{ scale: Animated.multiply(tapScale, breathScale) }] }]}>
        <Image
          source={image}
          style={{ width: size, height: size, backgroundColor: 'transparent' }}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={s.buddyName}>Бадди</Text>
    </TouchableOpacity>
  );

  // If fixed mode is enabled, render Buddy in a fixed position overlay
  if (fixed) {
    return (
      <View style={[
        s.buddyFixedContainer,
        fixedTop != null ? { top: fixedTop } : { bottom: fixedBottom ?? 180 }
      ]}>
        {buddyContent}
      </View>
    );
  }

  return buddyContent;
}

const s = StyleSheet.create({
  buddyFixedContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  buddyWrapper:  { alignItems: 'center', marginBottom: 4, padding: 4, marginTop: 20 },
  buddyAnimated: { alignItems: 'center' },
  buddyName:     { fontSize: 12, color: C.muted, marginTop: 4, fontWeight: '500' },
});
