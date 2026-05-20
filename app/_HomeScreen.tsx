// _HomeScreen.tsx — SafeBuddy home screen

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUDDY_FIXED_SPACER, C, MSG, ScheduleBlock, getDailySuggestion, getProgressionMessage } from './_constants';
import { DailySuggestion, ReflectiveBoost, T } from './_SharedUI';

interface HomeScreenProps {
  stars: number;
  totalEver: number;
  completedToday: number;
  totalMissions: number;
  childName: string;
  lastMission: string | null;
  showSuggestion: boolean;
  skipSensitivity: number;
  skipCount: number;
  onStart: () => void;
  onRewards: () => void;
  onSettings: () => void;
  onSuggestionAccept: (suggestion: any) => void;
  onSuggestionSkip: () => void;
  speak: (t: string) => void;
  currentBlock?: ScheduleBlock | null;
  nextBlock?: ScheduleBlock | null;
  scheduleEnabled?: boolean;
  onOpenDay?: () => void;
}

export default function HomeScreen({
  totalEver, completedToday, totalMissions,
  childName, lastMission, showSuggestion, skipSensitivity,
  onStart, onRewards, onSettings, onSuggestionAccept, onSuggestionSkip,
  skipCount, speak,
  currentBlock, nextBlock, scheduleEnabled, onOpenDay,
}: HomeScreenProps) {
  const threshold = Math.max(1, skipSensitivity ?? 2);
  const [idleMsg] = useState(() =>
    skipCount >= threshold ? 'Всё нормально. Я здесь с тобой'
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
      <T style={s.greeting} speak={speak}>{greeting}</T>
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

      {(currentBlock || nextBlock) && (
        <View style={s.scheduleCard}>
          {currentBlock && (
            <TouchableOpacity
              style={s.scheduleNow}
              onPress={() => speak(`Сейчас ${currentBlock.title}`)}
              activeOpacity={0.8}
            >
              <Text style={s.scheduleEmoji}>{currentBlock.emoji}</Text>
              <View style={s.scheduleInfo}>
                <Text style={s.scheduleNowLabel}>Сейчас</Text>
                <Text style={s.scheduleTitle}>{currentBlock.title}</Text>
              </View>
              <Text style={s.scheduleTime}>до {currentBlock.endTime}</Text>
            </TouchableOpacity>
          )}
          {nextBlock && (
            <TouchableOpacity
              style={s.scheduleNext}
              onPress={() => speak(`Потом ${nextBlock.title}`)}
              activeOpacity={0.8}
            >
              <Text style={s.scheduleNextEmoji}>{nextBlock.emoji}</Text>
              <View style={s.scheduleInfo}>
                <Text style={s.scheduleNextLabel}>Потом</Text>
                <Text style={s.scheduleNextTitle}>{nextBlock.title}</Text>
              </View>
              <Text style={s.scheduleTime}>{nextBlock.startTime}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity style={s.btnPrimary} onPress={onStart}>
        <Text style={s.btnPrimaryTxt}>🚀 Выбрать миссию</Text>
      </TouchableOpacity>
      {scheduleEnabled && onOpenDay && (
        <TouchableOpacity style={s.btnDay} onPress={onOpenDay}>
          <Text style={s.btnDayTxt}>📅 Мой день</Text>
        </TouchableOpacity>
      )}
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
  homeScroll:    { alignItems: 'center', padding: 20, paddingBottom: 52, paddingTop: BUDDY_FIXED_SPACER },
  greeting:      { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 4 },
  progressionMsg:{ fontSize: 15, color: C.green, textAlign: 'center', marginVertical: 6, fontWeight: '500', lineHeight: 22 },
  msg:           { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnDay:        { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.green, paddingVertical: 13, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnDayTxt:     { fontSize: 16, color: C.green, fontWeight: '600' },
  btnSettings:    { marginTop: 8, padding: 12, alignItems: 'center' },
  btnSettingsTxt: { fontSize: 14, color: C.muted },

  scheduleCard:      { width: '100%', marginBottom: 12, gap: 6 },
  scheduleNow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.greenLt, borderRadius: 14, borderWidth: 1, borderColor: C.green, padding: 14, gap: 12 },
  scheduleNext:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, gap: 12, opacity: 0.85 },
  scheduleEmoji:     { fontSize: 28 },
  scheduleNextEmoji: { fontSize: 22 },
  scheduleInfo:      { flex: 1 },
  scheduleNowLabel:  { fontSize: 10, color: C.green, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scheduleNextLabel: { fontSize: 10, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  scheduleTitle:     { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 1 },
  scheduleNextTitle: { fontSize: 14, fontWeight: '500', color: C.muted, marginTop: 1 },
  scheduleTime:      { fontSize: 12, color: C.muted, marginTop: 2 },
});
