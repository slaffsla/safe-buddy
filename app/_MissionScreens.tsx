// _MissionScreens.tsx — SafeBuddy mission and reward screens
// MissionPickScreen, ActiveScreen, CelebrateScreen, RewardsScreen

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Buddy from './_Buddy';
import { Confetti, ProgressBar, T } from './_SharedUI';
import {
  BuddyMood, C, MISSIONS_BIGGER, MISSIONS_EASY, MSG, REWARDS,
  getMilestoneMessage, getProgressionMessage, shouldShowConfetti,
} from './_constants';

// ── MissionPickScreen ─────────────────────────────────────────────────────────

export function MissionPickScreen({ onPick, onBack, speak, firstTime }: {
  onPick: (m: any) => void;
  onBack: () => void;
  speak: (t: string) => void;
  firstTime: boolean;
}) {
  const bigger = firstTime ? [] : MISSIONS_BIGGER;
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Buddy mood="encouraging" speak={speak} />
      <T style={s.pageTitle} speak={speak}>Выбери миссию</T>
      <T style={s.tier} speak={speak}>Лёгкие — одна звезда</T>
      {MISSIONS_EASY.map(m => (
        <TouchableOpacity
          key={m.id} style={s.mCard}
          onPress={() => onPick(m)}
          onLongPress={() => speak(`${m.title}. ${m.subtitle}`)}
        >
          <Text style={s.mEmoji}>{m.emoji}</Text>
          <View style={s.mInfo}>
            <Text style={s.mTitle}>{m.title}</Text>
            <Text style={s.mSub}>{m.subtitle}</Text>
          </View>
          <Text style={s.mStar}>⭐</Text>
        </TouchableOpacity>
      ))}
      {bigger.length > 0 && (
        <>
          <T style={s.tier} speak={speak}>Большие — две звезды</T>
          {bigger.map((m: any) => (
            <TouchableOpacity
              key={m.id} style={[s.mCard, s.mCardBig]}
              onPress={() => onPick(m)}
              onLongPress={() => speak(`${m.title}. ${m.subtitle}`)}
            >
              <Text style={s.mEmoji}>{m.emoji}</Text>
              <View style={s.mInfo}>
                <Text style={s.mTitle}>{m.title}</Text>
                <Text style={s.mSub}>{m.subtitle}</Text>
              </View>
              <Text style={s.mStar}>⭐⭐</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
      <T style={s.hint} speak={speak}>Удержи карточку, чтобы услышать</T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>← Назад</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── ActiveScreen ──────────────────────────────────────────────────────────────

export function ActiveScreen({ mission, onDone, onSkip, speak }: {
  mission: any;
  onDone: () => void;
  onSkip: () => void;
  speak: (t: string) => void;
}) {
  if (!mission) return null;
  return (
    <View style={s.screen}>
      <Buddy mood="excited" speak={speak} />
      <T style={s.msg} speak={speak}>{MSG.start}</T>
      <TouchableOpacity
        style={s.activeCard}
        onPress={() => speak(`${mission.title}. ${mission.subtitle}`)}
        activeOpacity={0.85}
      >
        <Text style={s.activeEmoji}>{mission.emoji}</Text>
        <Text style={s.activeTitle}>{mission.title}</Text>
        <Text style={s.activeSub}>{mission.subtitle}</Text>
        <View style={s.starsRow}>
          {Array(mission.stars).fill('⭐').map((_: any, i: number) => (
            <Text key={i} style={s.starBig}>⭐</Text>
          ))}
        </View>
        <Text style={s.tapHint}>нажми чтобы услышать ещё раз</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnPrimary} onPress={onDone}>
        <Text style={s.btnPrimaryTxt}>✅ Я сделал!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>Пропустить</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── CelebrateScreen ───────────────────────────────────────────────────────────

export function CelebrateScreen({
  mission, stars, totalEver, totalMissions, completedToday,
  isVeryExcited, onContinue, onRewards, speak,
}: {
  mission: any;
  stars: number;
  totalEver: number;
  totalMissions: number;
  completedToday: number;
  isVeryExcited: boolean;
  onContinue: () => void;
  onRewards: () => void;
  speak: (t: string) => void;
}) {
  if (!mission) return null;
  const showConfetti = shouldShowConfetti(totalMissions) || isVeryExcited;
  const isBig        = mission.stars >= 2;
  const buddyMood =
    (isVeryExcited ? 'very-excited'
    : showConfetti ? 'proud'
    : isBig        ? 'proud'
    :                'happy') as BuddyMood;
  const emotionalMsg = isVeryExcited
    ? getMilestoneMessage(totalEver)
    : getProgressionMessage(totalMissions, completedToday);

  return (
    <View style={s.screen}>
      {showConfetti && <Confetti trigger={true} />}
      <ProgressBar total={totalEver} speak={speak} />
<Buddy mood={buddyMood} speak={speak} celebrate={true} />      <T style={isVeryExcited ? s.milestoneTitle : s.celebTitle} speak={speak}>
        {isVeryExcited ? '🏆 Невероятно!' : 'Миссия выполнена! 🎉'}
      </T>
      <T style={s.progressionMsg} speak={speak}>{emotionalMsg}</T>
      <TouchableOpacity style={s.earnedCard} onPress={() => speak(MSG.done)} activeOpacity={0.85}>
        <Text style={s.earnedEmoji}>{mission.emoji}</Text>
        <Text style={s.earnedName}>{mission.title}</Text>
        <Text style={s.earnedStars}>{Array(mission.stars).fill('⭐').join(' ')}</Text>
        <Text style={s.earnedTotal}>Всего: ⭐ {stars}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnPrimary} onPress={onContinue}>
        <Text style={s.btnPrimaryTxt}>🚀 Ещё миссию!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSecondary} onPress={onRewards}>
        <Text style={s.btnSecondaryTxt}>🎁 Посмотреть награды</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── RewardsScreen ─────────────────────────────────────────────────────────────

export default function RewardsScreen({ stars, totalEver, onBack, speak, onRedeem }: {
  stars: number;
  totalEver: number;
  onBack: () => void;
  speak: (t: string) => void;
  onRedeem: (r: any) => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="serene" speak={speak} />
      <T style={s.pageTitle} speak={speak}>Твои награды</T>
      {REWARDS.map(r => {
        const can = stars >= r.cost;
        return (
          <TouchableOpacity
            key={r.id}
            style={[s.rCard, !can && s.rLocked]}
            onPress={() => can ? onRedeem(r) : speak(`${r.title}. Ещё немного — и готово`)}
            activeOpacity={0.7}
          >
            <Text style={s.rEmoji}>{r.emoji}</Text>
            <View style={s.rInfo}>
              <Text style={s.rTitle}>{r.title}</Text>
              <Text style={s.rCost}>{Array(r.cost).fill('⭐').join('')}</Text>
            </View>
            {can
              ? <Text style={s.rReady}>Получить!</Text>
              : <Text style={s.rNeed}>ещё немного</Text>
            }
          </TouchableOpacity>
        );
      })}
      <T style={s.hint} speak={speak}>Нажми на награду, чтобы получить её</T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>← Назад</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scroll:  { alignItems: 'center', padding: 20, paddingBottom: 52 },
  msg:     { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  tapHint: { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: 'italic' },

  pageTitle: { fontSize: 21, fontWeight: '700', color: C.text, marginBottom: 14, alignSelf: 'flex-start' },
  tier:      { fontSize: 12, fontWeight: '600', color: C.muted, alignSelf: 'flex-start', marginTop: 10, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:      { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },

  celebTitle:    { fontSize: 24, fontWeight: '800', color: C.green, marginBottom: 4, textAlign: 'center' },
  milestoneTitle:{ fontSize: 26, fontWeight: '900', color: C.green, marginBottom: 4, textAlign: 'center' },
  progressionMsg:{ fontSize: 15, color: C.green, textAlign: 'center', marginVertical: 6, fontWeight: '500', lineHeight: 22 },

  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnSkip:    { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack:    { marginTop: 18, padding: 12 },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: '500' },

  // Mission cards
  mCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 7, width: '100%' },
  mCardBig: { backgroundColor: C.gold, borderColor: C.goldBdr },
  mEmoji:   { fontSize: 30, marginRight: 11 },
  mInfo:    { flex: 1 },
  mTitle:   { fontSize: 15, fontWeight: '600', color: C.text },
  mSub:     { fontSize: 12, color: C.muted, marginTop: 2 },
  mStar:    { fontSize: 17 },

  // Active screen
  activeCard:  { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 26, alignItems: 'center', width: '100%', marginVertical: 12 },
  activeEmoji: { fontSize: 58, marginBottom: 10 },
  activeTitle: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  activeSub:   { fontSize: 14, color: C.muted, marginTop: 5, textAlign: 'center' },
  starsRow:    { flexDirection: 'row', marginTop: 12, gap: 4 },
  starBig:     { fontSize: 24 },

  // Celebrate
  earnedCard:  { backgroundColor: C.greenLt, borderRadius: 20, padding: 22, alignItems: 'center', width: '100%', marginVertical: 12 },
  earnedEmoji: { fontSize: 44, marginBottom: 6 },
  earnedName:  { fontSize: 16, fontWeight: '600', color: C.green },
  earnedStars: { fontSize: 26, marginTop: 6 },
  earnedTotal: { fontSize: 14, color: C.green, marginTop: 4, fontWeight: '500' },

  // Rewards
  rCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 7, width: '100%' },
  rLocked: { opacity: 0.42 },
  rEmoji:  { fontSize: 29, marginRight: 11 },
  rInfo:   { flex: 1 },
  rTitle:  { fontSize: 15, fontWeight: '600', color: C.text },
  rCost:   { fontSize: 12, color: C.muted, marginTop: 2 },
  rReady:  { fontSize: 13, color: C.green, fontWeight: '700' },
  rNeed:   { fontSize: 11, color: C.muted, textAlign: 'right' },
});
