// _Buddy.tsx — SafeBuddy character component
// Breathing animation on ambient moods, tap bounce on all moods.

import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BUDDY, BuddyMood, C, MSG } from './_constants';

interface BuddyProps {
  mood?: BuddyMood;
  speak: (t: string) => void;
  size?: number;
  celebrate: boolean;
}

export default function Buddy({ mood = 'calm', speak, size = 130, celebrate = false}: BuddyProps) {
  const tapScale    = useRef(new Animated.Value(1)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathAnim  = useRef<Animated.CompositeAnimation | null>(null);

  const isAmbient = mood === 'calm' || mood === 'gentle-reminder' || mood === 'serene';

  useEffect(() => {
    if (isAmbient) {
      breathAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathScale, { toValue: 1.12, duration: 2800, useNativeDriver: true }),
          Animated.timing(breathScale, { toValue: 1.0,  duration: 2800, useNativeDriver: true }),
        ])
      );
      breathAnim.current.start();
    } else {
      breathAnim.current?.stop();
      breathScale.setValue(1);
    }
    return () => { breathAnim.current?.stop(); };
  }, [mood]);

  useEffect(() => {
  if (!celebrate) return;
  Animated.sequence([
    Animated.timing(tapScale, { toValue: 1.2,  duration: 180, useNativeDriver: true }),
    Animated.timing(tapScale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
    Animated.timing(tapScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
    Animated.timing(tapScale, { toValue: 1.0,  duration: 250, useNativeDriver: true }),
  ]).start();
}, [celebrate]);

  const lines: Record<string, string> = {
    calm:              MSG.idle,
    'gentle-reminder': MSG.idle_alt,
    serene:            MSG.serene,
    encouraging:       MSG.encouraging,
    thinking:          MSG.thinking,
    excited:           MSG.start,
    happy:             MSG.done,
    proud:             MSG.done,
    'very-excited':    MSG['very-excited'],
  };

  function handlePress() {
    Animated.sequence([
      Animated.timing(tapScale, { toValue: 1.12, duration: 100, useNativeDriver: true }),
      Animated.timing(tapScale, { toValue: 1.0,  duration: 150, useNativeDriver: true }),
    ]).start();
    speak(lines[mood] || MSG.idle);
  }

  const image = BUDDY[mood] || BUDDY.calm;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[s.buddy, { transform: [{ scale: Animated.multiply(tapScale, breathScale) }] }]}>
        <Image
          source={image}
          style={{ width: size, height: size, backgroundColor: 'transparent' }}
          resizeMode="contain"
        />
        <Text style={s.buddyName}>Бадди</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  buddy:     { alignItems: 'center', marginBottom: 4, padding: 4 },
  buddyName: { fontSize: 12, color: C.muted, marginTop: 4, fontWeight: '500' },
});
