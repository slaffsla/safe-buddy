// _Buddy.tsx — SafeBuddy character component
// Breathing animation on ambient moods, tap bounce on all moods.

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BuddyMood,
  C,
  getBuddyImage,
  getBuddyLine,
  isAmbientMood,
} from "./_constants";
import { t } from "./i18n";

interface BuddyProps {
  mood?: BuddyMood;
  speak: (t: string) => void;
  size?: number;
  celebrate?: boolean;
  pettable?: boolean; // enabled only on breathing screen
  onPettingChange?: (petting: boolean) => void;
  // Optional external phase scale (used by BreathingScreen to sync phases).
  phaseScale?: Animated.Value | Animated.AnimatedInterpolation<number>;
  fixed?: boolean; // If true, Buddy stays fixed on screen (absolute positioning)
  fixedBottom?: number; // Distance from bottom when fixed (default: 180)
  fixedTop?: number; // Distance from top when fixed
}

export default function Buddy({
  mood = "calm",
  speak,
  size = 130,
  celebrate = false,
  pettable = false,
  onPettingChange,
  phaseScale,
  fixed = false,
  fixedBottom,
  fixedTop = 90,
}: BuddyProps) {
  const tapScale = useRef(new Animated.Value(1)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const pettingScale = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef<Animated.CompositeAnimation | null>(null);
  const [isPetting, setIsPetting] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const heartTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pettableRef = useRef(pettable);
  const onPettingChangeRef = useRef(onPettingChange);

  const isAmbient = isAmbientMood(mood);
  const activePhaseScale = phaseScale ?? breathScale;

  useEffect(() => {
    if (phaseScale) {
      breathAnim.current?.stop();
      breathScale.setValue(1);
      return;
    }
    if (isAmbient) {
      breathAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathScale, {
            toValue: 1.19,
            duration: 2800,
            useNativeDriver: true,
          }),
          Animated.timing(breathScale, {
            toValue: 1.0,
            duration: 2800,
            useNativeDriver: true,
          }),
        ]),
      );
      breathAnim.current.start();
    } else {
      breathAnim.current?.stop();
      breathScale.setValue(1);
    }
    return () => {
      breathAnim.current?.stop();
    };
  }, [breathScale, isAmbient, phaseScale]);

  useEffect(() => {
    if (!celebrate) return;
    Animated.sequence([
      Animated.timing(tapScale, {
        toValue: 1.2,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(tapScale, {
        toValue: 1.08,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(tapScale, {
        toValue: 1.15,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tapScale, {
        toValue: 1.0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [celebrate, tapScale]);

  useEffect(() => {
    return () => {
      if (heartTimeout.current) clearTimeout(heartTimeout.current);
    };
  }, []);

  useEffect(() => {
    pettableRef.current = pettable;
  }, [pettable]);

  useEffect(() => {
    onPettingChangeRef.current = onPettingChange;
  }, [onPettingChange]);

  useEffect(() => {
    if (pettable) return;
    setIsPetting(false);
    setShowHearts(false);
    onPettingChangeRef.current?.(false);
    if (heartTimeout.current) clearTimeout(heartTimeout.current);
    Animated.spring(pettingScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [pettable, pettingScale]);

  function startPetting() {
    if (!pettableRef.current) return;
    if (heartTimeout.current) clearTimeout(heartTimeout.current);
    setIsPetting(true);
    onPettingChangeRef.current?.(true);
    setShowHearts(true);
    Animated.spring(pettingScale, {
      toValue: 1.08,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }

  function endPetting() {
    if (!isPetting && !showHearts) return;
    setIsPetting(false);
    onPettingChangeRef.current?.(false);
    Animated.spring(pettingScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
    heartTimeout.current = setTimeout(() => setShowHearts(false), 1200);
  }

  function handlePress() {
    if (pettable || isPetting) return;
    Animated.sequence([
      Animated.timing(tapScale, {
        toValue: 1.12,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tapScale, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    speak(getBuddyLine(mood));
  }

  const image = getBuddyImage(mood);
  const buddyContent = (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={startPetting}
        onPressOut={endPetting}
        activeOpacity={1}
        style={s.buddyWrapper}
      >
        <Animated.View
          style={[
            s.buddyAnimated,
            {
              transform: [
                {
                  scale: Animated.multiply(
                    Animated.multiply(tapScale, activePhaseScale),
                    pettingScale,
                  ),
                },
              ],
            },
          ]}
        >
          <Image
            source={image}
            style={{
              width: size,
              height: size,
              backgroundColor: "transparent",
            }}
            resizeMode="contain"
          />
        </Animated.View>
      </TouchableOpacity>

      <Text style={s.buddyName}>{t("buddy.name")}</Text>

      {pettable && showHearts && (
        <View style={s.heartsContainer} pointerEvents="none">
          <FloatingHeart delay={0} driftX={-10} />
          <FloatingHeart delay={220} driftX={0} />
          <FloatingHeart delay={440} driftX={10} />
        </View>
      )}
    </View>
  );

  // If fixed mode is enabled, render Buddy in a fixed position overlay
  if (fixed) {
    return (
      <View
        style={[
          s.buddyFixedContainer,
          fixedTop != null ? { top: fixedTop } : { bottom: fixedBottom ?? 180 },
        ]}
      >
        {buddyContent}
      </View>
    );
  }

  return buddyContent;
}

function FloatingHeart({ delay, driftX }: { delay: number; driftX: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: driftX,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -52,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [delay, driftX, opacity, translateX, translateY]);

  return (
    <Animated.Text
      style={[
        s.heart,
        { transform: [{ translateX }, { translateY }], opacity },
      ]}
    >
      ♡
    </Animated.Text>
  );
}

const s = StyleSheet.create({
  buddyFixedContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
    pointerEvents: "box-none",
  },
  buddyWrapper: {
    alignItems: "center",
    marginBottom: 4,
    padding: 4,
  },
  buddyAnimated: { alignItems: "center" },
  buddyName: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
    alignSelf: "center",
  },
  heartsContainer: {
    position: "absolute",
    top: 18,
    right: -10,
    width: 52,
    alignItems: "center",
    pointerEvents: "none",
  },
  heart: {
    position: "absolute",
    fontSize: 21,
    color: "#FF8FAB",
  },
});
