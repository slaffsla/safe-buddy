// _HomeScreen.tsx — SafeBuddy home screen

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Buddy from './_Buddy';
import { DailySuggestion, ReflectiveBoost, T } from './_SharedUI';
import { BuddyMood, C, MSG, getDailySuggestion, getProgressionMessage } from './_constants';
import { ProgressBar } from './_SharedUI';

interface HomeScreenProps {
  stars: number;
  totalEver: number;
  completedToday: number;
  totalMissions: number;
  childName: string;
  lastMission: string | null;
  showSuggestion: boolean;
  skipCount: number;
  onStart: () => void;
  onRewards: () => void;
  onSettings: () => void;
  onSuggestionAccept: (suggestion: any) => void;
  onSuggestionSkip: () => void;
  speak: (t: string) => void;
}

export default function HomeScreen({
  totalEver, completedToday, totalMissions,
  childName, lastMission, showSuggestion,
  onStart, onRewards, onSettings, onSuggestionAccept, onSuggestionSkip,
  skipCount, speak,
}: HomeScreenProps) {
  const [homeMood] = useState<BuddyMood>(() =>
    skipCount >= 2 ? 'gentle-reminder'
    : Math.random() > 0.7 ? 'gentle-reminder'
    : 'calm'
  );
  const [idleMsg] = useState(() =>
    skipCount >= 2 ? 'Всё нормально. Я здесь с тобой'
    : Math.random() > 0.7 ? MSG.idle_alt
    : MSG.idle
  );

  const greeting   = childName ? `Привет, ${childName}!` : 'Привет!';
  const suggestion = getDailySuggestion();
  const progressMsg = totalMissions > 0
    ? getProgressionMessage(totalMissions, completedToday)
    : null;

  return (
    <ScrollView contentContainerStyle={s.homeScroll}>
      <ProgressBar total={totalEver} speak={speak} />
      <T style={s.greeting} speak={speak}>{greeting}</T>
      <Buddy mood={homeMood} speak={speak} />
      <ReflectiveBoost lastMission={lastMission} speak={speak} />
      {progressMsg && <T style={s.progressionMsg} speak={speak}>{progressMsg}</T>}
      <T style={s.msg} speak={speak}>{idleMsg}</T>
      {showSuggestion && (
        <DailySuggestion
          suggestion={suggestion}
          onAccept={() => onSuggestionAccept(suggestion)}
          onSkip={onSuggestionSkip}
          speak={speak}
        />
      )}
      <TouchableOpacity style={s.btnPrimary} onPress={onStart}>
        <Text style={s.btnPrimaryTxt}>🚀 Выбрать миссию</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSecondary} onPress={onRewards}>
        <Text style={s.btnSecondaryTxt}>🎁 Мои награды</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSettings} onPress={onSettings}>
        <Text style={s.btnSettingsTxt}>⚙️ Настройки для родителей</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  homeScroll:    { alignItems: 'center', padding: 20, paddingBottom: 52 },
  greeting:      { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 4 },
  progressionMsg:{ fontSize: 15, color: C.green, textAlign: 'center', marginVertical: 6, fontWeight: '500', lineHeight: 22 },
  msg:           { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnSettings:    { marginTop: 8, padding: 12, alignItems: 'center' },
  btnSettingsTxt: { fontSize: 14, color: C.muted },
});
