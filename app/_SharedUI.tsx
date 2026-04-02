// _SharedUI.tsx — SafeBuddy small shared UI components
// T, ProgressBar, ReflectiveBoost, DailySuggestion, Confetti

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { C, DAILY_SUGGESTIONS, getProgress } from './_constants';

// ── T — Speakable text wrapper ─────────────────────────────────────────────────

export function T({ children, style, speak }: {
  children: any;
  style: any;
  speak: (t: string) => void;
}) {
  if (!children) return null;
  return (
    <TouchableOpacity onPress={() => speak(String(children))} activeOpacity={0.65}>
      <Text style={style}>{children}</Text>
    </TouchableOpacity>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

export function ProgressBar({ total, speak }: { total: number; speak: (t: string) => void }) {
  const { pct } = getProgress(total);
  const emotionalLabel =
    total === 0  ? 'Первая звезда ждёт тебя!'
    : total < 5  ? 'Ты только начинаешь — это здорово'
    : total < 10 ? 'Ты уже так много сделал'
    : total < 20 ? 'Ты становишься сильнее каждый день'
    : total < 50 ? 'Бадди видит твой рост'
    : 'Ты настоящая звезда';

  return (
    <TouchableOpacity
      style={s.pbWrap}
      onPress={() => speak(`${emotionalLabel}. Звёзд: ${total}`)}
      activeOpacity={0.75}
    >
      <View style={s.pbRow}>
        <Text style={s.pbEmotion}>{emotionalLabel}</Text>
        <Text style={s.pbStars}>⭐ {total}</Text>
      </View>
      <View style={s.pbTrack}>
        <View style={[s.pbFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

// ── ReflectiveBoost ───────────────────────────────────────────────────────────

export function ReflectiveBoost({ lastMission, speak }: {
  lastMission: string | null;
  speak: (t: string) => void;
}) {
  if (!lastMission) return null;
  const text = `Вчера ты справился с "${lastMission}" — Бадди помнит это`;
  return (
    <TouchableOpacity style={s.reflectCard} onPress={() => speak(text)} activeOpacity={0.8}>
      <Text style={s.reflectText}>{text}</Text>
    </TouchableOpacity>
  );
}

// ── DailySuggestion ───────────────────────────────────────────────────────────

export function DailySuggestion({ suggestion, onAccept, onSkip, speak }: {
  suggestion: typeof DAILY_SUGGESTIONS[0];
  onAccept: () => void;
  onSkip: () => void;
  speak: (t: string) => void;
}) {
  return (
    <View style={s.suggestionCard}>
      <Text style={s.suggestionIcon}>💡</Text>
      <T style={s.suggestionText} speak={speak}>{suggestion.text}</T>
      <View style={s.suggestionRow}>
        <TouchableOpacity style={s.suggestionYes} onPress={onAccept}>
          <Text style={s.suggestionYesTxt}>Попробую!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.suggestionNo} onPress={onSkip}>
          <Text style={s.suggestionNoTxt}>Не сейчас</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────
export function Confetti({ trigger }: { trigger: boolean }) {
  if (!trigger) return null;
  return (
    <ConfettiCannon
      count={130}
      origin={{ x: -20, y: 0 }}
      autoStart={true}
      fadeOut={true}
      fallSpeed={3200}
      colors={['#1D6B4F', '#F59E0B', '#E1F5EE', '#FFD700', '#FF6B6B', '#4ECDC4']}
    />
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Progress bar
  pbWrap:    { width: '100%', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 14 },
  pbRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pbEmotion: { fontSize: 12, color: C.green, fontWeight: '500', flex: 1, marginRight: 8 },
  pbStars:   { fontSize: 13, fontWeight: '700', color: C.green },
  pbTrack:   { height: 8, backgroundColor: C.track, borderRadius: 4, overflow: 'hidden' },
  pbFill:    { height: 8, backgroundColor: C.green, borderRadius: 4, minWidth: 8 },

  // Reflective boost
  reflectCard: { backgroundColor: C.reflect, borderRadius: 12, padding: 12, width: '100%', marginBottom: 10, borderWidth: 1, borderColor: C.greenLt },
  reflectText: { fontSize: 13, color: C.green, textAlign: 'center', fontStyle: 'italic', lineHeight: 19 },

  // Daily suggestion
  suggestionCard:   { backgroundColor: C.gold, borderRadius: 14, borderWidth: 1, borderColor: C.goldBdr, padding: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  suggestionIcon:   { fontSize: 28, marginBottom: 4 },
  suggestionText:   { fontSize: 14, color: '#92400E', textAlign: 'center', marginVertical: 8, lineHeight: 20 },
  suggestionRow:    { flexDirection: 'row', gap: 10 },
  suggestionYes:    { backgroundColor: C.green, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 18 },
  suggestionYesTxt: { fontSize: 14, color: '#fff', fontWeight: '600' },
  suggestionNo:     { backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 },
  suggestionNoTxt:  { fontSize: 14, color: C.muted },
});
