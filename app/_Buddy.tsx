// _Buddy.tsx — SafeBuddy character component
// Breathing animation on ambient moods, tap bounce on all moods.

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
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

const TAP_MOOD_DELAY_MS = 280;
const PETTING_HEART_INTERVAL_MS = 520;
const PRONOUNCED_PETTING_HEART_INTERVAL_MS = 360;
const BUDDY_TAP_TTS_GUARD_MS = 2200;

interface BuddyProps {
  mood?: BuddyMood;
  speak: (t: string) => void;
  size?: number;
  celebrate?: boolean;
  pettable?: boolean; // enabled only on breathing screen
  imageSource?: ImageSourcePropType;
  pettingMood?: BuddyMood;
  pettingHeartMode?: "normal" | "pronounced";
  tapHeartsInPetting?: boolean;
  pettingStartDelayMs?: number;
  onPettingChange?: (petting: boolean) => void;
  onTap?: () => void;
  // Optional external phase scale (used by BreathingScreen to sync phases).
  phaseScale?: Animated.Value | Animated.AnimatedInterpolation<number>;
  ambientMaxScale?: number;
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
  imageSource,
  pettingMood = "encouraging",
  pettingHeartMode = "normal",
  tapHeartsInPetting = false,
  pettingStartDelayMs = 0,
  onPettingChange,
  onTap,
  phaseScale,
  ambientMaxScale = 1.19,
  fixed = false,
  fixedBottom,
  fixedTop = 90,
}: BuddyProps) {
  const [tapScale] = useState(() => new Animated.Value(1));
  const [breathScale] = useState(() => new Animated.Value(1));
  const [pettingScale] = useState(() => new Animated.Value(1));
  const [petBounceY] = useState(() => new Animated.Value(0));
  const breathAnim = useRef<Animated.CompositeAnimation | null>(null);
  const petBounceAnim = useRef<Animated.CompositeAnimation | null>(null);
  const [isPetting, setIsPetting] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const [heartBurst, setHeartBurst] = useState(0);
  const [showTapHearts, setShowTapHearts] = useState(false);
  const [tapHeartBurst, setTapHeartBurst] = useState(0);
  const heartTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pettingStartTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tapHeartTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapMoodTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pettableRef = useRef(pettable);
  const onPettingChangeRef = useRef(onPettingChange);
  const pettingHappenedDuringPressRef = useRef(false);
  const lastBuddyTapTtsAtRef = useRef(0);

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
            toValue: ambientMaxScale,
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
  }, [ambientMaxScale, breathScale, isAmbient, phaseScale]);

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
      if (heartInterval.current) clearInterval(heartInterval.current);
      if (pettingStartTimeout.current)
        clearTimeout(pettingStartTimeout.current);
      if (tapHeartTimeout.current) clearTimeout(tapHeartTimeout.current);
      if (tapMoodTimeout.current) clearTimeout(tapMoodTimeout.current);
      petBounceAnim.current?.stop();
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
    const clearPettingState = setTimeout(() => {
      setIsPetting(false);
      setShowHearts(false);
    }, 0);
    onPettingChangeRef.current?.(false);
    if (heartTimeout.current) clearTimeout(heartTimeout.current);
    if (pettingStartTimeout.current) {
      clearTimeout(pettingStartTimeout.current);
      pettingStartTimeout.current = null;
    }
    if (heartInterval.current) {
      clearInterval(heartInterval.current);
      heartInterval.current = null;
    }
    Animated.spring(pettingScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
    petBounceAnim.current?.stop();
    petBounceAnim.current = null;
    Animated.timing(petBounceY, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
    return () => clearTimeout(clearPettingState);
  }, [pettable, petBounceY, pettingScale]);

  function beginPetting() {
    if (!pettableRef.current) return;
    pettingHappenedDuringPressRef.current = true;
    if (tapMoodTimeout.current) {
      clearTimeout(tapMoodTimeout.current);
      tapMoodTimeout.current = null;
    }
    if (heartTimeout.current) clearTimeout(heartTimeout.current);
    if (!isPetting) setIsPetting(true);
    onPettingChangeRef.current?.(true);
    setShowHearts(true);
    setHeartBurst((n) => n + 1);
    if (!heartInterval.current) {
      heartInterval.current = setInterval(
        () => {
          setHeartBurst((n) => n + 1);
        },
        pettingHeartMode === "pronounced"
          ? PRONOUNCED_PETTING_HEART_INTERVAL_MS
          : PETTING_HEART_INTERVAL_MS,
      );
    }
    Animated.spring(pettingScale, {
      toValue: pettingHeartMode === "pronounced" ? 1.14 : 1.1,
      friction: 7,
      tension: 55,
      useNativeDriver: true,
    }).start();
    if (!petBounceAnim.current) {
      petBounceAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(petBounceY, {
            toValue: -2.5,
            duration: 180,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(petBounceY, {
            toValue: 0,
            duration: 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      petBounceAnim.current.start();
    }
  }

  function startPetting() {
    if (!pettableRef.current) return;
    if (pettingStartTimeout.current) clearTimeout(pettingStartTimeout.current);
    if (pettingStartDelayMs > 0) {
      pettingStartTimeout.current = setTimeout(() => {
        pettingStartTimeout.current = null;
        beginPetting();
      }, pettingStartDelayMs);
      return;
    }
    beginPetting();
  }

  function endPetting() {
    if (pettingStartTimeout.current) {
      clearTimeout(pettingStartTimeout.current);
      pettingStartTimeout.current = null;
    }
    if (!isPetting && !showHearts) return;
    setIsPetting(false);
    onPettingChangeRef.current?.(false);
    if (heartInterval.current) {
      clearInterval(heartInterval.current);
      heartInterval.current = null;
    }
    Animated.spring(pettingScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
    petBounceAnim.current?.stop();
    petBounceAnim.current = null;
    Animated.timing(petBounceY, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.sin),
      useNativeDriver: true,
    }).start();
    heartTimeout.current = setTimeout(() => setShowHearts(false), 220);
  }

  function handlePress() {
    const isPettingMode = pettableRef.current;
    const wasPettingGesture =
      isPettingMode && pettingHappenedDuringPressRef.current;
    pettingHappenedDuringPressRef.current = false;

    if (!isPettingMode || tapHeartsInPetting) {
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
      if (tapHeartTimeout.current) clearTimeout(tapHeartTimeout.current);
      setShowTapHearts(true);
      setTapHeartBurst((n) => n + 1);
      tapHeartTimeout.current = setTimeout(() => setShowTapHearts(false), 650);
    }

    if (wasPettingGesture) return;
    const now = Date.now();
    if (now - lastBuddyTapTtsAtRef.current < BUDDY_TAP_TTS_GUARD_MS) {
      return;
    }
    lastBuddyTapTtsAtRef.current = now;

    if (!isPettingMode) {
      speak(getBuddyLine(mood));
    }

    if (tapMoodTimeout.current) clearTimeout(tapMoodTimeout.current);
    tapMoodTimeout.current = setTimeout(() => {
      onTap?.();
      tapMoodTimeout.current = null;
    }, TAP_MOOD_DELAY_MS);
  }

  const visualMood = pettable && isPetting ? pettingMood : mood;
  const image = imageSource ?? getBuddyImage(visualMood);
  const buddyContent = (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={startPetting}
        onPressOut={endPetting}
        activeOpacity={1}
        hitSlop={
          pettable ? { top: 24, right: 24, bottom: 24, left: 24 } : undefined
        }
        pressRetentionOffset={
          pettable ? { top: 40, right: 40, bottom: 40, left: 40 } : undefined
        }
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
                { translateY: petBounceY },
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
        <View style={s.heartsContainer}>
          {pettingHeartMode === "pronounced" ? (
            <>
              <FloatingHeart
                key={`hb-${heartBurst}-1`}
                delay={0}
                driftX={-30}
                fontSize={48}
                travelY={-104}
              />
              <FloatingHeart
                key={`hb-${heartBurst}-2`}
                delay={60}
                driftX={-12}
                fontSize={42}
                travelY={-94}
              />
              <FloatingHeart
                key={`hb-${heartBurst}-3`}
                delay={120}
                driftX={10}
                fontSize={50}
                travelY={-112}
              />
              <FloatingHeart
                key={`hb-${heartBurst}-4`}
                delay={180}
                driftX={30}
                fontSize={40}
                travelY={-92}
              />
            </>
          ) : (
            <>
              <FloatingHeart
                key={`hb-${heartBurst}-1`}
                delay={0}
                driftX={-16}
              />
              <FloatingHeart key={`hb-${heartBurst}-2`} delay={90} driftX={0} />
              <FloatingHeart
                key={`hb-${heartBurst}-3`}
                delay={180}
                driftX={16}
              />
            </>
          )}
        </View>
      )}

      {showTapHearts && (
        <View style={s.tapHeartsContainer}>
          <SubtleFloatingHeart
            key={`th-${tapHeartBurst}-1`}
            delay={0}
            driftX={-8}
          />
          <SubtleFloatingHeart
            key={`th-${tapHeartBurst}-2`}
            delay={70}
            driftX={8}
          />
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

function SubtleFloatingHeart({
  delay,
  driftX,
}: {
  delay: number;
  driftX: number;
}) {
  const [translateY] = useState(() => new Animated.Value(0));
  const [translateX] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: driftX,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -48,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [delay, driftX, opacity, translateX, translateY]);

  return (
    <Animated.Text
      style={[
        s.subtleHeart,
        { transform: [{ translateX }, { translateY }], opacity },
      ]}
    >
      ♡
    </Animated.Text>
  );
}

function FloatingHeart({
  delay,
  driftX,
  fontSize = 32,
  travelY = -72,
}: {
  delay: number;
  driftX: number;
  fontSize?: number;
  travelY?: number;
}) {
  const [translateY] = useState(() => new Animated.Value(0));
  const [translateX] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: driftX,
          duration: 950,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: travelY,
          duration: 950,
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
  }, [delay, driftX, opacity, translateX, translateY, travelY]);

  return (
    <Animated.Text
      style={[
        s.heart,
        { fontSize },
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
    top: 6,
    right: -20,
    width: 78,
    alignItems: "center",
    pointerEvents: "none",
  },
  tapHeartsContainer: {
    position: "absolute",
    top: 16,
    right: -14,
    width: 50,
    alignItems: "center",
    pointerEvents: "none",
  },
  subtleHeart: {
    position: "absolute",
    fontSize: 18,
    color: "#69BFA6",
  },
  heart: {
    position: "absolute",
    fontSize: 32,
    color: "#FF8FAB",
  },
});
