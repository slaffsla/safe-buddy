// SafeBuddy MVP Demo
// Copy this into your App.js in your Expo project
// Run: npx expo start

import { useState } from 'react';
import {
    SafeAreaView, ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';

// ── DATA ──────────────────────────────────────────────────────────────────────

const MISSIONS = [
  { id: 1, title: 'Stand on one leg', subtitle: 'Hold for 5 seconds!', stars: 1, emoji: '🦩' },
  { id: 2, title: 'Stretch to your toes', subtitle: 'Reach down slowly', stars: 1, emoji: '🙆' },
  { id: 3, title: 'Jump 3 times', subtitle: 'As high as you can!', stars: 1, emoji: '🦘' },
  { id: 4, title: 'Clean your toys', subtitle: 'Pick up one small area', stars: 2, emoji: '🧸' },
  { id: 5, title: 'Give someone a hug', subtitle: 'Spread the warmth!', stars: 2, emoji: '💛' },
  { id: 6, title: 'Drink a glass of water', subtitle: 'Slow and steady', stars: 1, emoji: '💧' },
];

const REWARDS = [
  { id: 1, title: 'Extra screen time', cost: 3, emoji: '📱' },
  { id: 2, title: 'Choose tonight\'s dinner', cost: 4, emoji: '🍕' },
  { id: 3, title: 'Stay up 30 min later', cost: 5, emoji: '🌙' },
  { id: 4, title: 'Special snack', cost: 3, emoji: '🍭' },
];

const BUDDY_MESSAGES = {
  idle: ["Hey! Ready for a mission? 🌟", "What shall we do today?", "I'm here with you! 👋"],
  start: ["Let's do this together!", "You've got this!", "I believe in you! 💪"],
  done: ["Amazing job!!! 🎉", "You're a superstar! ⭐", "I knew you could do it!"],
  reward: ["Wow, you earned a reward!", "Look at all those stars! ✨", "You worked so hard!"],
};

// ── SCREENS ───────────────────────────────────────────────────────────────────

function BuddyFace({ mood = 'happy' }) {
  const faces = {
    happy: '😊', excited: '🤩', proud: '😄', calm: '🙂', waiting: '👀'
  };
  return (
    <View style={styles.buddyContainer}>
      <Text style={styles.buddyEmoji}>{faces[mood] || '😊'}</Text>
      <Text style={styles.buddyName}>Buddy</Text>
    </View>
  );
}

function StarBar({ count }) {
  return (
    <View style={styles.starBar}>
      <Text style={styles.starCount}>⭐ {count} stars</Text>
    </View>
  );
}

function HomeScreen({ onStart, stars, completedToday }) {
  const msg = BUDDY_MESSAGES.idle[Math.floor(Math.random() * BUDDY_MESSAGES.idle.length)];
  return (
    <View style={styles.screen}>
      <BuddyFace mood="happy" />
      <Text style={styles.buddyMessage}>{msg}</Text>
      <StarBar count={stars} />
      {completedToday > 0 && (
        <Text style={styles.completedText}>
          {completedToday} mission{completedToday > 1 ? 's' : ''} done today! 🎯
        </Text>
      )}
      <TouchableOpacity style={styles.bigButton} onPress={onStart}>
        <Text style={styles.bigButtonText}>🚀 Pick a Mission</Text>
      </TouchableOpacity>
    </View>
  );
}

function MissionPickScreen({ onPick, onBack }) {
  const easy = MISSIONS.filter(m => m.stars === 1);
  const bigger = MISSIONS.filter(m => m.stars === 2);
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.screenTitle}>Choose your mission</Text>
      <Text style={styles.tierLabel}>⭐ Easy missions</Text>
      {easy.map(m => (
        <TouchableOpacity key={m.id} style={styles.missionCard} onPress={() => onPick(m)}>
          <Text style={styles.missionEmoji}>{m.emoji}</Text>
          <View style={styles.missionInfo}>
            <Text style={styles.missionTitle}>{m.title}</Text>
            <Text style={styles.missionSub}>{m.subtitle}</Text>
          </View>
          <Text style={styles.missionStars}>⭐</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.tierLabel}>⭐⭐ Bigger missions</Text>
      {bigger.map(m => (
        <TouchableOpacity key={m.id} style={[styles.missionCard, styles.biggerCard]} onPress={() => onPick(m)}>
          <Text style={styles.missionEmoji}>{m.emoji}</Text>
          <View style={styles.missionInfo}>
            <Text style={styles.missionTitle}>{m.title}</Text>
            <Text style={styles.missionSub}>{m.subtitle}</Text>
          </View>
          <Text style={styles.missionStars}>⭐⭐</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ActiveMissionScreen({ mission, onDone, onSkip }) {
  const msg = BUDDY_MESSAGES.start[Math.floor(Math.random() * BUDDY_MESSAGES.start.length)];
  return (
    <View style={styles.screen}>
      <BuddyFace mood="excited" />
      <Text style={styles.buddyMessage}>{msg}</Text>
      <View style={styles.activeMissionCard}>
        <Text style={styles.activeMissionEmoji}>{mission.emoji}</Text>
        <Text style={styles.activeMissionTitle}>{mission.title}</Text>
        <Text style={styles.activeMissionSub}>{mission.subtitle}</Text>
        <View style={styles.starsPreview}>
          {Array(mission.stars).fill('⭐').map((s, i) => (
            <Text key={i} style={styles.previewStar}>{s}</Text>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.bigButton} onPress={onDone}>
        <Text style={styles.bigButtonText}>✅ I did it!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

function CelebrationScreen({ mission, totalStars, onContinue, onRewards }) {
  const msg = BUDDY_MESSAGES.done[Math.floor(Math.random() * BUDDY_MESSAGES.done.length)];
  return (
    <View style={styles.screen}>
      <BuddyFace mood="proud" />
      <Text style={styles.celebrationTitle}>🎉 Mission Complete!</Text>
      <Text style={styles.buddyMessage}>{msg}</Text>
      <View style={styles.earnedCard}>
        <Text style={styles.earnedEmoji}>{mission.emoji}</Text>
        <Text style={styles.earnedTitle}>{mission.title}</Text>
        <Text style={styles.earnedStars}>
          +{Array(mission.stars).fill('⭐').join(' ')}
        </Text>
        <Text style={styles.totalStars}>Total: ⭐ {totalStars}</Text>
      </View>
      <TouchableOpacity style={styles.bigButton} onPress={onContinue}>
        <Text style={styles.bigButtonText}>🚀 Another mission!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.rewardButton} onPress={onRewards}>
        <Text style={styles.rewardButtonText}>🎁 See rewards</Text>
      </TouchableOpacity>
    </View>
  );
}

function RewardsScreen({ stars, onBack }) {
  const msg = BUDDY_MESSAGES.reward[Math.floor(Math.random() * BUDDY_MESSAGES.reward.length)];
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <BuddyFace mood="excited" />
      <Text style={styles.buddyMessage}>{msg}</Text>
      <StarBar count={stars} />
      <Text style={styles.screenTitle}>Your rewards</Text>
      {REWARDS.map(r => {
        const canAfford = stars >= r.cost;
        return (
          <View key={r.id} style={[styles.rewardCard, !canAfford && styles.rewardLocked]}>
            <Text style={styles.rewardEmoji}>{r.emoji}</Text>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTitle}>{r.title}</Text>
              <Text style={styles.rewardCost}>Costs: {Array(r.cost).fill('⭐').join('')}</Text>
            </View>
            {canAfford
              ? <Text style={styles.rewardReady}>Ready!</Text>
              : <Text style={styles.rewardNeed}>{r.cost - stars} more ⭐</Text>
            }
          </View>
        );
      })}
      <Text style={styles.rewardNote}>
        Ask a grown-up to unlock your reward 🔐
      </Text>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('home');
  const [stars, setStars] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [activeMission, setActiveMission] = useState(null);

  function pickMission(mission) {
    setActiveMission(mission);
    setScreen('active');
  }

  function completeMission() {
    setStars(s => s + activeMission.stars);
    setCompletedToday(c => c + 1);
    setScreen('celebrate');
  }

  function skipMission() {
    setActiveMission(null);
    setScreen('home');
  }

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'home' && (
        <HomeScreen
          onStart={() => setScreen('pick')}
          stars={stars}
          completedToday={completedToday}
        />
      )}
      {screen === 'pick' && (
        <MissionPickScreen
          onPick={pickMission}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'active' && activeMission && (
        <ActiveMissionScreen
          mission={activeMission}
          onDone={completeMission}
          onSkip={skipMission}
        />
      )}
      {screen === 'celebrate' && activeMission && (
        <CelebrationScreen
          mission={activeMission}
          totalStars={stars}
          onContinue={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
        />
      )}
      {screen === 'rewards' && (
        <RewardsScreen
          stars={stars}
          onBack={() => setScreen('home')}
        />
      )}
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const C = {
  bg: '#F7F6F2',
  card: '#FFFFFF',
  primary: '#1D6B4F',
  primaryLight: '#E1F5EE',
  amber: '#F59E0B',
  text: '#1A1A18',
  muted: '#6B6B68',
  border: '#E5E5E2',
  bigger: '#FFF8E7',
  biggerBorder: '#F59E0B',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  screen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, paddingBottom: 40,
  },

  // Buddy
  buddyContainer: { alignItems: 'center', marginBottom: 8 },
  buddyEmoji: { fontSize: 72 },
  buddyName: { fontSize: 14, color: C.muted, marginTop: 4, fontWeight: '500' },
  buddyMessage: {
    fontSize: 18, color: C.text, textAlign: 'center',
    marginVertical: 12, lineHeight: 26, paddingHorizontal: 16,
  },

  // Star bar
  starBar: {
    backgroundColor: C.primaryLight, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 12,
  },
  starCount: { fontSize: 18, fontWeight: '600', color: C.primary },

  completedText: { fontSize: 14, color: C.muted, marginBottom: 8 },

  // Buttons
  bigButton: {
    backgroundColor: C.primary, borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 40,
    marginTop: 16, width: '100%', alignItems: 'center',
  },
  bigButtonText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  skipButton: { marginTop: 12, padding: 12 },
  skipButtonText: { fontSize: 16, color: C.muted },
  backButton: { marginTop: 20, padding: 12 },
  backButtonText: { fontSize: 16, color: C.primary, fontWeight: '500' },
  rewardButton: {
    backgroundColor: C.bigger, borderRadius: 16, borderWidth: 1,
    borderColor: C.biggerBorder, paddingVertical: 16,
    paddingHorizontal: 40, marginTop: 10, width: '100%', alignItems: 'center',
  },
  rewardButtonText: { fontSize: 18, color: '#92400E', fontWeight: '600' },

  // Mission pick
  screenTitle: {
    fontSize: 22, fontWeight: '700', color: C.text,
    marginBottom: 16, alignSelf: 'flex-start',
  },
  tierLabel: {
    fontSize: 14, fontWeight: '600', color: C.muted,
    alignSelf: 'flex-start', marginTop: 12, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  missionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 8, width: '100%',
  },
  biggerCard: {
    backgroundColor: C.bigger, borderColor: C.biggerBorder,
  },
  missionEmoji: { fontSize: 32, marginRight: 12 },
  missionInfo: { flex: 1 },
  missionTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  missionSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  missionStars: { fontSize: 18 },

  // Active mission
  activeMissionCard: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 32, alignItems: 'center', width: '100%', marginVertical: 16,
  },
  activeMissionEmoji: { fontSize: 64, marginBottom: 12 },
  activeMissionTitle: { fontSize: 24, fontWeight: '700', color: C.text, textAlign: 'center' },
  activeMissionSub: { fontSize: 16, color: C.muted, marginTop: 6, textAlign: 'center' },
  starsPreview: { flexDirection: 'row', marginTop: 16, gap: 4 },
  previewStar: { fontSize: 28 },

  // Celebration
  celebrationTitle: {
    fontSize: 28, fontWeight: '800', color: C.primary,
    marginBottom: 8, textAlign: 'center',
  },
  earnedCard: {
    backgroundColor: C.primaryLight, borderRadius: 20,
    padding: 24, alignItems: 'center', width: '100%', marginVertical: 16,
  },
  earnedEmoji: { fontSize: 48, marginBottom: 8 },
  earnedTitle: { fontSize: 18, fontWeight: '600', color: C.primary },
  earnedStars: { fontSize: 28, marginTop: 8 },
  totalStars: { fontSize: 16, color: C.primary, marginTop: 6, fontWeight: '500' },

  // Rewards
  rewardCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 8, width: '100%',
  },
  rewardLocked: { opacity: 0.5 },
  rewardEmoji: { fontSize: 32, marginRight: 12 },
  rewardInfo: { flex: 1 },
  rewardTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  rewardCost: { fontSize: 13, color: C.muted, marginTop: 2 },
  rewardReady: { fontSize: 14, color: C.primary, fontWeight: '700' },
  rewardNeed: { fontSize: 12, color: C.muted },
  rewardNote: {
    fontSize: 13, color: C.muted, textAlign: 'center',
    marginTop: 16, paddingHorizontal: 20, lineHeight: 20,
  },
});
