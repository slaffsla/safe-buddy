// _DemoScreens.tsx — SafeBuddy demo / onboarding flow screens

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Buddy from './_Buddy';
import { T } from './_SharedUI';
import { C } from './_constants';

// ── DemoIntroScreen ───────────────────────────────────────────────────────────

export function DemoIntroScreen({ onStart, onSkip, speak }: {
  onStart: () => void;
  onSkip: () => void;
  speak: (t: string) => void;
}) {
  return (
    <View style={s.screen}>
      <Buddy mood="calm" speak={speak} />
      <T style={s.msg} speak={speak}>Давай попробуем вместе!</T>
      <T style={s.sub} speak={speak}>Три простых задания — для разминки</T>
      <TouchableOpacity style={s.btnPrimary} onPress={onStart}>
        <Text style={s.btnPrimaryTxt}>▶ Начать разминку</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>Пропустить</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── DemoStepScreen ────────────────────────────────────────────────────────────

export function DemoStepScreen({ step, stepIndex, totalSteps, onDone, speak }: {
  step: { title: string; emoji: string; praise: string };
  stepIndex: number;
  totalSteps: number;
  onDone: () => void;
  speak: (t: string) => void;
}) {
  const [done, setDone] = useState(false);

  function handleDone() {
    if (done) return;
    setDone(true);
    speak(step.praise);
    setTimeout(onDone, 1000);
  }

  return (
    <View style={s.screen}>
      <Buddy mood={done ? 'happy' : 'excited'} speak={speak} />
      <View style={s.stepCounter}>
        {Array(totalSteps).fill(0).map((_: any, i: number) => (
          <View key={i} style={[s.stepDot, i <= stepIndex && s.stepDotActive]} />
        ))}
      </View>
      <TouchableOpacity style={s.demoCard} onPress={() => speak(step.title)} activeOpacity={0.85}>
        <Text style={s.demoEmoji}>{step.emoji}</Text>
        <Text style={s.demoTitle}>{step.title}</Text>
        <Text style={s.tapHint}>нажми чтобы услышать</Text>
      </TouchableOpacity>
      {!done ? (
        <TouchableOpacity style={s.btnPrimary} onPress={handleDone}>
          <Text style={s.btnPrimaryTxt}>✅ Сделал!</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.praiseRow}>
          <Text style={s.praiseText}>{step.praise} 🎉</Text>
        </View>
      )}
    </View>
  );
}

// ── DemoCompleteScreen ────────────────────────────────────────────────────────

export function DemoCompleteScreen({ onGoToMissions, onGoHome, speak }: {
  onGoToMissions: () => void;
  onGoHome: () => void;
  speak: (t: string) => void;
}) {
  return (
    <View style={s.screen}>
      <Buddy mood="proud" speak={speak} />
      <Text style={s.celebTitle}>Ты справился! 🎉</Text>
      <T style={s.msg} speak={speak}>Хочешь попробовать настоящую миссию?</T>
      <View style={s.demoCompleteButtons}>
        <TouchableOpacity style={s.btnPrimary} onPress={onGoToMissions}>
          <Text style={s.btnPrimaryTxt}>🚀 Да, хочу!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={onGoHome}>
          <Text style={s.btnSecondaryTxt}>⏳ Попозже</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  msg:     { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  sub:     { fontSize: 13, color: C.muted, marginBottom: 6, textAlign: 'center' },
  tapHint: { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: 'italic' },
  celebTitle: { fontSize: 24, fontWeight: '800', color: C.green, marginBottom: 4, textAlign: 'center' },

  stepCounter:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stepDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  stepDotActive: { backgroundColor: C.green },
  demoCard:      { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', width: '100%', marginVertical: 12 },
  demoEmoji:     { fontSize: 64, marginBottom: 12 },
  demoTitle:     { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  praiseRow:     { marginTop: 16, alignItems: 'center' },
  praiseText:    { fontSize: 26, fontWeight: '800', color: C.green },

  demoCompleteButtons: { width: '100%', marginTop: 8 },
  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnSkip:    { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
});
