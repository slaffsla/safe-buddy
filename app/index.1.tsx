// SafeBuddy v6.2 — All 9 character images + emotional progression + idle breathing
// npx expo install expo-speech @react-native-async-storage/async-storage react-native-confetti-cannon

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated, Image,
    Platform,
    SafeAreaView, ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

// ── CHARACTER IMAGES ──────────────────────────────────────────────────────────
// All paths verified against /assets/Character/ — exact filenames, exact casing

const BUDDY = {
  calm:             require('../assets/Character/buddy-calm.png'),
  'gentle-reminder':require('../assets/Character/buddy-gentle-reminder.png'),
  serene:           require('../assets/Character/buddy-serene.png'),
  encouraging:      require('../assets/Character/buddy-encouraging.png'),
  thinking:         require('../assets/Character/buddy-thinking.png'),
  excited:          require('../assets/Character/buddy-excited.png'),
  happy:            require('../assets/Character/buddy-happy.png'),
  proud:            require('../assets/Character/buddy-proud.png'),
  'very-excited':   require('../assets/Character/buddy-very-excited.png'),
};

// ── MOOD TRIGGER LOGIC ────────────────────────────────────────────────────────
// calm            → home default, quiet idle, breathing sessions
// gentle-reminder → home alternate (~30%), morning, after 2 skips
// serene          → rewards browsing, reflective boost, breathing end
// encouraging     → mission pick, hesitation, daily suggestion
// thinking        → tiny facts delivery, loading
// excited         → active mission, star earned, big mission ⭐⭐
// happy           → easy mission done ⭐, demo praise
// proud           → demo complete, milestone, reward redemption
// very-excited    → first 10 stars ever, every 50 stars, first reward redeemed (RARE)

// ── VERY-EXCITED TRIGGER LOGIC ────────────────────────────────────────────────
function shouldBeVeryExcited(totalEver, prevTotalEver, firstRewardRedeemed) {
  if (firstRewardRedeemed) return true;
  if (prevTotalEver < 10 && totalEver >= 10) return true;
  const prevFifty = Math.floor(prevTotalEver / 50);
  const currFifty = Math.floor(totalEver / 50);
  if (currFifty > prevFifty && currFifty > 0) return true;
  return false;
}

// ── EMOTIONAL PROGRESSION MESSAGES ───────────────────────────────────────────
// Dragon Family insight: feeling of growth over numeric economy

function getProgressionMessage(totalMissions, completedToday) {
  if (totalMissions === 1) return 'Первая миссия! Ты начал!';
  if (completedToday === 1) return 'Сегодня ты уже начал — это главное';
  if (completedToday === 2) return 'Две миссии сегодня — ты становишься сильнее';
  if (completedToday === 3) return 'Три миссии! Бадди очень гордится тобой';
  if (completedToday >= 4) return 'Ты сегодня настоящий герой!';
  if (totalMissions === 5)  return 'Пять миссий всего! Ты растёшь!';
  if (totalMissions === 10) return 'Десять миссий — ты уже совсем другой!';
  return 'Бадди видит как ты растёшь';
}

function getMilestoneMessage(totalEver) {
  if (totalEver >= 10  && totalEver < 11)  return 'Десять звёзд! Ты сияешь!';
  if (totalEver >= 20  && totalEver < 22)  return 'Двадцать звёзд — ты растёшь каждый день';
  if (totalEver >= 50  && totalEver < 52)  return 'Пятьдесят звёзд! Бадди так тобой гордится!';
  if (totalEver >= 100 && totalEver < 102) return 'Сто звёзд. Ты настоящая звезда!';
  return `${totalEver} звёзд — и ты продолжаешь!`;
}

// ── STORAGE ───────────────────────────────────────────────────────────────────

const K = {
  STARS:            'sb_stars_v2',
  TOTAL_EVER:       'sb_total_v2',
  COMPLETED_TODAY:  'sb_today_v2',
  LAST_DATE:        'sb_date_v2',
  DEMO_DONE:        'sb_demo_done',
  TOTAL_MISSIONS:   'sb_total_missions',
  CHILD_NAME:       'sb_child_name',
  LAST_MISSION:     'sb_last_mission',     // for reflective boost
  SKIP_COUNT:       'sb_skip_count',       // consecutive skips
  FIRST_REWARD:     'sb_first_reward',     // first real reward redeemed
};

const CONFETTI_AT = [1, 5, 10, 25, 50, 100];

// ── DATA ──────────────────────────────────────────────────────────────────────

const DEMO_STEPS = [
  { id: 'd1', title: 'Хлопни в ладоши',  emoji: '👏', praise: 'Отлично!' },
  { id: 'd2', title: 'Прыгни!',           emoji: '🦘', praise: 'Супер!' },
  { id: 'd3', title: 'Коснись носа',      emoji: '👃', praise: 'Молодец!' },
];

const MISSIONS_EASY = [
  { id: 1, title: 'Постой на одной ноге',   subtitle: 'Держись 5 секунд', stars: 1, emoji: '🦩' },
  { id: 2, title: 'Потянись к пальцам ног', subtitle: 'Медленно вниз',    stars: 1, emoji: '🙆' },
  { id: 3, title: 'Прыгни три раза',        subtitle: 'Как можно выше',   stars: 1, emoji: '🦘' },
  { id: 4, title: 'Выпей стакан воды',      subtitle: 'Не спеши',         stars: 1, emoji: '💧' },
];

const MISSIONS_BIGGER = [
  { id: 5, title: 'Убери игрушки',       subtitle: 'Хотя бы один уголок', stars: 2, emoji: '🧸' },
  { id: 6, title: 'Обними кого-нибудь',  subtitle: 'Подари тепло',        stars: 2, emoji: '💛' },
];

const REWARDS = [
  { id: 1, title: 'Дополнительный мультик',         cost: 3, emoji: '📺' },
  { id: 2, title: 'Выбрать ужин сегодня',            cost: 4, emoji: '🍕' },
  { id: 3, title: 'Лечь спать на 30 минут позже',    cost: 5, emoji: '🌙' },
  { id: 4, title: 'Любимый перекус',                 cost: 3, emoji: '🍭' },
  { id: 5, title: 'Игра с папой',                    cost: 2, emoji: '🎮' },
];

// T2 — Daily suggestions (encouraging state, skippable)
const DAILY_SUGGESTIONS = [
  { text: 'Попробуй сегодня выпить больше воды', mission: 4 },
  { text: 'Сделай что-то приятное для кого-то рядом', mission: 6 },
  { text: 'Потянись — твоё тело скажет спасибо', mission: 2 },
  { text: 'Прыгни немного — станет веселее', mission: 3 },
  { text: 'Убери один маленький уголок — сразу легче', mission: 5 },
];

const MSG = {
  idle:             'Привет! Нажми на меня',
  idle_alt:         'Я рядом',
  start:            'Давай вместе!',
  done:             'Молодец!',
  reward:           'Посмотри сколько всего!',
  encouraging:      'Ты можешь это сделать',
  thinking:         'Знаешь ли ты...',
  serene:           'Всё хорошо. Я рядом.',
};

const MILESTONES = [5, 10, 20, 35, 50, 75, 100, 150, 200];

// ── HELPERS ───────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

function getProgress(total) {
  const next = MILESTONES.find(m => m > total) ?? MILESTONES[MILESTONES.length - 1] * 2;
  let prev = 0;
  for (const m of [0, ...MILESTONES]) { if (m <= total) prev = m; else break; }
  const pct = next === prev ? 1 : Math.min((total - prev) / (next - prev), 1);
  return { next, pct };
}

const shouldShowConfetti = n => CONFETTI_AT.includes(n);

function getDailySuggestion() {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  return DAILY_SUGGESTIONS[dayOfYear % DAILY_SUGGESTIONS.length];
}

// ── TTS ───────────────────────────────────────────────────────────────────────

async function resolveRussianVoice() {
  try {
    await new Promise(r => setTimeout(r, 800));
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices?.length) return null;
    return (
      voices.find(v => v.language === 'ru-RU' && v.quality === Speech.VoiceQuality?.Enhanced) ||
      voices.find(v => v.language?.startsWith('ru')) ||
      null
    );
  } catch { return null; }
}

function useSpeech() {
  const voiceRef = useRef(null);
  useEffect(() => {
    resolveRussianVoice().then(v => { voiceRef.current = v; });
    return () => { try { Speech.stop(); } catch {} };
  }, []);

  return useCallback((text) => {
    if (!text) return;
    try { Speech.stop(); } catch {}
    const opts = {
      language: 'ru-RU',
      pitch: 1.05,
      rate: Platform.OS === 'ios' ? 0.52 : 0.85,
    };
    if (voiceRef.current?.identifier) opts.voice = voiceRef.current.identifier;
    setTimeout(() => {
      try { Speech.speak(text, opts); } catch (e) { console.log('TTS:', e); }
    }, Platform.OS === 'ios' ? 120 : 0);
  }, []);
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────

function Confetti({ trigger }) {
  if (!trigger) return null;
  return (
    <ConfettiCannon
      count={130}
      origin={{ x: -20, y: 0 }}
      autoStart={true}
      fadeOut={true}
      fallSpeed={3000}
      colors={['#1D6B4F', '#F59E0B', '#E1F5EE', '#FFD700', '#FF6B6B', '#4ECDC4']}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

// ── BUDDY COMPONENT ───────────────────────────────────────────────────────────
// Idle breathing animation on calm and gentle-reminder states
// Tap animation on all states
// Very-excited used sparingly

function Buddy({ mood = 'calm', speak, size = 130 }) {
  const tapScale    = useRef(new Animated.Value(1)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathAnim  = useRef(null);

  const isAmbient = mood === 'calm' || mood === 'gentle-reminder' || mood === 'serene';

  useEffect(() => {
    if (isAmbient) {
      breathAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathScale, { toValue: 1.03, duration: 2800, useNativeDriver: true }),
          Animated.timing(breathScale, { toValue: 1.0,  duration: 2800, useNativeDriver: true }),
        ])
      );
      breathAnim.current.start();
    } else {
      if (breathAnim.current) breathAnim.current.stop();
      breathScale.setValue(1);
    }
    return () => { if (breathAnim.current) breathAnim.current.stop(); };
  }, [mood]);

  const lines = {
    calm:              MSG.idle,
    'gentle-reminder': MSG.idle_alt,
    serene:            MSG.serene,
    encouraging:       MSG.encouraging,
    thinking:          MSG.thinking,
    excited:           MSG.start,
    happy:             MSG.done,
    proud:             MSG.done,
    'very-excited':    'Невероятно!!!',
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
      <Animated.View style={[
        s.buddy,
        { transform: [{ scale: Animated.multiply(tapScale, breathScale) }] }
      ]}>
        <Image source={image} style={[s.buddyImage, { width: size, height: size }]} resizeMode="contain" />
        <Text style={s.buddyName}>Бадди</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function T({ children, style, speak }) {
  if (!children) return null;
  return (
    <TouchableOpacity onPress={() => speak(String(children))} activeOpacity={0.65}>
      <Text style={style}>{children}</Text>
    </TouchableOpacity>
  );
}

// ── PROGRESS BAR (emotional language) ────────────────────────────────────────

function ProgressBar({ total, speak }) {
  const { next, pct } = getProgress(total);
  // Emotional label over numeric
  const emotionalLabel = total === 0
    ? 'Первая звезда ждёт тебя!'
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

// ── REFLECTIVE BOOST ──────────────────────────────────────────────────────────
// T3 — "Yesterday you did great with..."

function ReflectiveBoost({ lastMission, speak }) {
  if (!lastMission) return null;
  const text = `Вчера ты справился с "${lastMission}" — Бадди помнит это`;
  return (
    <TouchableOpacity style={s.reflectCard} onPress={() => speak(text)} activeOpacity={0.8}>
      <Text style={s.reflectText}>{text}</Text>
    </TouchableOpacity>
  );
}

// ── DAILY SUGGESTION ──────────────────────────────────────────────────────────
// T2 — one gentle suggestion, skippable

function DailySuggestion({ suggestion, onAccept, onSkip, speak }) {
  if (!suggestion) return null;
  return (
    <View style={s.suggestionCard}>
      <Buddy mood="encouraging" speak={speak} size={70} />
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

// ── SCREENS ───────────────────────────────────────────────────────────────────

function DemoIntroScreen({ onStart, onSkip, speak }) {
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

function DemoStepScreen({ step, stepIndex, totalSteps, onDone, speak }) {
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
        {Array(totalSteps).fill(0).map((_, i) => (
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

function DemoCompleteScreen({ onGoToMissions, onGoHome, speak }) {
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

function HomeScreen({
  stars, totalEver, completedToday, totalMissions,
  childName, lastMission, showSuggestion,
  onStart, onRewards, onSuggestionAccept, onSuggestionSkip,
  skipCount, speak
}) {
  // Alternate between calm and gentle-reminder (~30% gentle)
  const [homeMood] = useState(() =>
    skipCount >= 2 ? 'gentle-reminder'
    : Math.random() > 0.7 ? 'gentle-reminder'
    : 'calm'
  );
  const [idleMsg] = useState(() =>
    skipCount >= 2 ? 'Всё нормально. Я здесь с тобой'
    : Math.random() > 0.7 ? MSG.idle_alt
    : MSG.idle
  );

  const greeting = childName
    ? `Привет, ${childName}!`
    : 'Привет!';

  const suggestion = getDailySuggestion();
  const progressMsg = totalMissions > 0
    ? getProgressionMessage(totalMissions, completedToday)
    : null;

  return (
    <ScrollView contentContainerStyle={s.homeScroll}>
      <ProgressBar total={totalEver} speak={speak} />

      <View style={s.greetingRow}>
        <T style={s.greeting} speak={speak}>{greeting}</T>
      </View>

      <Buddy mood={homeMood} speak={speak} />

      {/* T3 — Reflective boost (yesterday's mission) */}
      <ReflectiveBoost lastMission={lastMission} speak={speak} />

      {/* Emotional progression message */}
      {progressMsg && (
        <T style={s.progressionMsg} speak={speak}>{progressMsg}</T>
      )}

      <T style={s.msg} speak={speak}>{idleMsg}</T>

      {/* T2 — Daily suggestion */}
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
    </ScrollView>
  );
}

function MissionPickScreen({ onPick, onBack, speak, firstTime }) {
  const bigger = firstTime ? [] : MISSIONS_BIGGER;
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Buddy mood="encouraging" speak={speak} size={90} />
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
          {bigger.map(m => (
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

function ActiveScreen({ mission, onDone, onSkip, speak }) {
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
          {Array(mission.stars).fill('⭐').map((_, i) => (
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

function CelebrateScreen({
  mission, stars, totalEver, totalMissions, completedToday,
  isVeryExcited, onContinue, onRewards, speak
}) {
  if (!mission) return null;

  const showConfetti  = shouldShowConfetti(totalMissions) || isVeryExcited;
  const isBig         = mission.stars >= 2;
  const buddyMood     = isVeryExcited ? 'very-excited'
                      : showConfetti  ? 'proud'
                      : isBig        ? 'proud'
                      :                'happy';

  const emotionalMsg  = isVeryExcited
    ? getMilestoneMessage(totalEver)
    : getProgressionMessage(totalMissions, completedToday);

  return (
    <View style={s.screen}>
      {showConfetti && <Confetti trigger={true} />}
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood={buddyMood} speak={speak} />
      <T style={isVeryExcited ? s.milestoneTitle : s.celebTitle} speak={speak}>
        {isVeryExcited ? '🏆 Невероятно!' : 'Миссия выполнена! 🎉'}
      </T>
      {/* Emotional progression over numeric */}
      <T style={s.progressionMsg} speak={speak}>{emotionalMsg}</T>
      <TouchableOpacity
        style={s.earnedCard}
        onPress={() => speak(MSG.done)}
        activeOpacity={0.85}
      >
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

function RewardsScreen({ stars, totalEver, onBack, speak }) {
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="serene" speak={speak} size={90} />
      <T style={s.pageTitle} speak={speak}>Твои награды</T>
      {REWARDS.map(r => {
        const can = stars >= r.cost;
        return (
          <TouchableOpacity
            key={r.id}
            style={[s.rCard, !can && s.rLocked]}
            onPress={() => speak(can
              ? `${r.title}. Готово!`
              : `${r.title}. Ещё немного — и готово`
            )}
            activeOpacity={0.7}
          >
            <Text style={s.rEmoji}>{r.emoji}</Text>
            <View style={s.rInfo}>
              <Text style={s.rTitle}>{r.title}</Text>
              <Text style={s.rCost}>{Array(r.cost).fill('⭐').join('')}</Text>
            </View>
            {can
              ? <Text style={s.rReady}>Готово!</Text>
              : <Text style={s.rNeed}>ещё немного</Text>
            }
          </TouchableOpacity>
        );
      })}
      <T style={s.hint} speak={speak}>Попроси папу или маму разблокировать</T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>← Назад</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [ready,           setReady]          = useState(false);
  const [screen,          setScreen]         = useState('home');
  const [demoStep,        setDemoStep]        = useState(0);
  const [stars,           setStars]           = useState(0);
  const [totalEver,       setTotalEver]       = useState(0);
  const [prevTotalEver,   setPrevTotalEver]   = useState(0);
  const [completedToday,  setCompletedToday]  = useState(0);
  const [totalMissions,   setTotalMissions]   = useState(0);
  const [mission,         setMission]         = useState(null);
  const [firstMission,    setFirstMission]    = useState(true);
  const [childName,       setChildName]       = useState('');
  const [lastMission,     setLastMission]     = useState(null);
  const [skipCount,       setSkipCount]       = useState(0);
  const [isVeryExcited,   setIsVeryExcited]   = useState(false);
  const [showSuggestion,  setShowSuggestion]  = useState(true);
  const [firstReward,     setFirstReward]     = useState(false);
  const speak = useSpeech();

  useEffect(() => {
    (async () => {
      try {
        const vals = await AsyncStorage.multiGet([
          K.STARS, K.TOTAL_EVER, K.COMPLETED_TODAY,
          K.LAST_DATE, K.DEMO_DONE, K.TOTAL_MISSIONS,
          K.CHILD_NAME, K.LAST_MISSION, K.SKIP_COUNT, K.FIRST_REWARD,
        ]);
        const v = Object.fromEntries(vals);
        const today  = todayStr();
        const newDay = v[K.LAST_DATE] !== today;
        const st  = v[K.STARS]           ? parseInt(v[K.STARS],          10) : 0;
        const tot = v[K.TOTAL_EVER]      ? parseInt(v[K.TOTAL_EVER],     10) : st;
        const tm  = v[K.TOTAL_MISSIONS]  ? parseInt(v[K.TOTAL_MISSIONS], 10) : 0;
        const comp= newDay ? 0 : (v[K.COMPLETED_TODAY] ? parseInt(v[K.COMPLETED_TODAY], 10) : 0);
        const sk  = newDay ? 0 : (v[K.SKIP_COUNT] ? parseInt(v[K.SKIP_COUNT], 10) : 0);

        setStars(st);
        setTotalEver(tot);
        setPrevTotalEver(tot);
        setCompletedToday(comp);
        setTotalMissions(tm);
        setChildName(v[K.CHILD_NAME] || '');
        setLastMission(newDay ? v[K.LAST_MISSION] : null); // show yesterday's only
        setSkipCount(sk);
        setFirstReward(v[K.FIRST_REWARD] === 'true');
        setFirstMission(tm === 0);

        if (!v[K.DEMO_DONE]) setScreen('demo_intro');

        if (newDay) {
          await AsyncStorage.multiSet([
            [K.LAST_DATE, today],
            [K.COMPLETED_TODAY, '0'],
            [K.SKIP_COUNT, '0'],
          ]);
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Persist
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.multiSet([
      [K.STARS,          String(stars)],
      [K.TOTAL_EVER,     String(totalEver)],
      [K.TOTAL_MISSIONS, String(totalMissions)],
      [K.SKIP_COUNT,     String(skipCount)],
    ]).catch(console.log);
  }, [stars, totalEver, totalMissions, skipCount, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(K.COMPLETED_TODAY, String(completedToday)).catch(console.log);
  }, [completedToday, ready]);

  async function finishDemo() {
    await AsyncStorage.setItem(K.DEMO_DONE, 'true');
  }

  function handleDemoStepDone() {
    if (demoStep < DEMO_STEPS.length - 1) {
      setDemoStep(i => i + 1);
    } else {
      setScreen('demo_complete');
    }
  }

  function pickMission(m) {
    setMission(m);
    setSkipCount(0);
    speak(`${m.title}. ${m.subtitle}`);
    setScreen('active');
  }

  function handleSkip() {
    const newSkip = skipCount + 1;
    setSkipCount(newSkip);
    setMission(null);
    setScreen('home');
  }

  function completeMission() {
    if (!mission) return;
    const newTotal    = totalMissions + 1;
    const newEver     = totalEver + mission.stars;
    const veryExcited = shouldBeVeryExcited(newEver, prevTotalEver, false);

    setStars(n    => n + mission.stars);
    setPrevTotalEver(totalEver);
    setTotalEver(newEver);
    setCompletedToday(n => n + 1);
    setTotalMissions(newTotal);
    setSkipCount(0);
    setFirstMission(false);
    setIsVeryExcited(veryExcited);
    AsyncStorage.setItem(K.LAST_MISSION, mission.title).catch(console.log);
    setScreen('celebrate');
  }

  function handleSuggestionAccept(suggestion) {
    const m = MISSIONS_EASY.find(ms => ms.id === suggestion.mission) || MISSIONS_EASY[0];
    setShowSuggestion(false);
    pickMission(m);
  }

  if (!ready) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={C.green} />
      </SafeAreaView>
    );
  }

  const p = { speak, stars, totalEver };

  return (
    <SafeAreaView style={s.root}>

      {screen === 'demo_intro' && (
        <DemoIntroScreen
          speak={speak}
          onStart={() => { setDemoStep(0); setScreen('demo_step'); }}
          onSkip={async () => { await finishDemo(); setScreen('home'); }}
        />
      )}

      {screen === 'demo_step' && (
        <DemoStepScreen
          speak={speak}
          step={DEMO_STEPS[demoStep]}
          stepIndex={demoStep}
          totalSteps={DEMO_STEPS.length}
          onDone={handleDemoStepDone}
        />
      )}

      {screen === 'demo_complete' && (
        <DemoCompleteScreen
          speak={speak}
          onGoToMissions={async () => { await finishDemo(); setScreen('pick'); }}
          onGoHome={async () => { await finishDemo(); setScreen('home'); }}
        />
      )}

      {screen === 'home' && (
        <HomeScreen
          {...p}
          completedToday={completedToday}
          totalMissions={totalMissions}
          childName={childName}
          lastMission={lastMission}
          showSuggestion={showSuggestion}
          skipCount={skipCount}
          onStart={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
          onSuggestionAccept={handleSuggestionAccept}
          onSuggestionSkip={() => setShowSuggestion(false)}
        />
      )}

      {screen === 'pick' && (
        <MissionPickScreen
          {...p}
          firstTime={firstMission}
          onPick={pickMission}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'active' && (
        <ActiveScreen
          {...p}
          mission={mission}
          onDone={completeMission}
          onSkip={handleSkip}
        />
      )}

      {screen === 'celebrate' && (
        <CelebrateScreen
          {...p}
          mission={mission}
          totalMissions={totalMissions}
          completedToday={completedToday}
          isVeryExcited={isVeryExcited}
          onContinue={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
        />
      )}

      {screen === 'rewards' && (
        <RewardsScreen
          {...p}
          onBack={() => setScreen('home')}
        />
      )}

    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const C = {
  bg:      '#F7F6F2',
  white:   '#FFFFFF',
  green:   '#1D6B4F',
  greenLt: '#E1F5EE',
  text:    '#1A1A18',
  muted:   '#6B6B68',
  border:  '#E5E5E2',
  track:   '#D8D8D4',
  gold:    '#FFF8E7',
  goldBdr: '#F59E0B',
  reflect: '#F0F8F4',
};

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  center:    { justifyContent: 'center', alignItems: 'center' },
  screen:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scroll:    { alignItems: 'center', padding: 20, paddingBottom: 52 },
  homeScroll:{ alignItems: 'center', padding: 20, paddingBottom: 52 },

  // Progress bar — emotional first
  pbWrap:    { width: '100%', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 14 },
  pbRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pbEmotion: { fontSize: 12, color: C.green, fontWeight: '500', flex: 1, marginRight: 8 },
  pbStars:   { fontSize: 13, fontWeight: '700', color: C.green },
  pbTrack:   { height: 8, backgroundColor: C.track, borderRadius: 4, overflow: 'hidden' },
  pbFill:    { height: 8, backgroundColor: C.green, borderRadius: 4, minWidth: 8 },

  // Buddy
  buddy:      { alignItems: 'center', marginBottom: 4, padding: 4 },
  buddyImage: { width: 130, height: 130 },
  buddyName:  { fontSize: 12, color: C.muted, marginTop: 4, fontWeight: '500' },

  // Greeting
  greetingRow: { width: '100%', marginBottom: 4 },
  greeting:    { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },

  // Reflective boost
  reflectCard: { backgroundColor: C.reflect, borderRadius: 12, padding: 12, width: '100%', marginBottom: 10, borderWidth: 1, borderColor: C.greenLt },
  reflectText: { fontSize: 13, color: C.green, textAlign: 'center', fontStyle: 'italic', lineHeight: 19 },

  // Emotional progression
  progressionMsg: { fontSize: 15, color: C.green, textAlign: 'center', marginVertical: 6, fontWeight: '500', lineHeight: 22 },

  // Daily suggestion
  suggestionCard: { backgroundColor: C.gold, borderRadius: 14, borderWidth: 1, borderColor: C.goldBdr, padding: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  suggestionText: { fontSize: 14, color: '#92400E', textAlign: 'center', marginVertical: 8, lineHeight: 20 },
  suggestionRow:  { flexDirection: 'row', gap: 10 },
  suggestionYes:  { backgroundColor: C.green, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 18 },
  suggestionYesTxt:{ fontSize: 14, color: '#fff', fontWeight: '600' },
  suggestionNo:   { backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 },
  suggestionNoTxt:{ fontSize: 14, color: C.muted },

  // Text
  msg:           { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  sub:           { fontSize: 13, color: C.muted, marginBottom: 6, textAlign: 'center' },
  pageTitle:     { fontSize: 21, fontWeight: '700', color: C.text, marginBottom: 14, alignSelf: 'flex-start' },
  tier:          { fontSize: 12, fontWeight: '600', color: C.muted, alignSelf: 'flex-start', marginTop: 10, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:          { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  tapHint:       { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: 'italic' },
  celebTitle:    { fontSize: 24, fontWeight: '800', color: C.green, marginBottom: 4, textAlign: 'center' },
  milestoneTitle:{ fontSize: 26, fontWeight: '900', color: C.green, marginBottom: 4, textAlign: 'center' },

  // Buttons
  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnSkip:    { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack:    { marginTop: 18, padding: 12 },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: '500' },
  demoCompleteButtons: { width: '100%', marginTop: 8 },

  // Demo
  stepCounter:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stepDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  stepDotActive: { backgroundColor: C.green },
  demoCard:      { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', width: '100%', marginVertical: 12 },
  demoEmoji:     { fontSize: 64, marginBottom: 12 },
  demoTitle:     { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  praiseRow:     { marginTop: 16, alignItems: 'center' },
  praiseText:    { fontSize: 26, fontWeight: '800', color: C.green },

  // Mission cards
  mCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 7, width: '100%' },
  mCardBig: { backgroundColor: C.gold, borderColor: C.goldBdr },
  mEmoji:   { fontSize: 30, marginRight: 11 },
  mInfo:    { flex: 1 },
  mTitle:   { fontSize: 15, fontWeight: '600', color: C.text },
  mSub:     { fontSize: 12, color: C.muted, marginTop: 2 },
  mStar:    { fontSize: 17 },

  // Active
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