// SettingsScreen.tsx — SafeBuddy parent settings
// Self-contained component. Import into app/index.tsx.
// Engineered for easy extension — add new setting by:
//   1. Add key to AppSettings type
//   2. Add    to DEFAULT_SETTINGS
//   3. Add storage key to SK
//   4. Add UI row to the relevant section
//
// Usage in index.tsx:
//   import SettingsScreen from './_SettingsScreen';
//   {screen === 'settings' && (
//     <SettingsScreen
//       onClose={() => setScreen('home')}
//       onSettingsChange={(s) => applySettings(s)}
//     />
//   )}

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_MORNING_STEPS, DEFAULT_WEEKDAY_IDS, DEFAULT_WEEKEND_IDS,
  MISSION_POOL, MorningStep
} from './_constants';

// ── TYPES ─────────────────────────────────────────────────────────────────────

// Central settings type. All future settings go here.
// Adding a field: update type + DEFAULT_SETTINGS + SK + load/save + UI.
export type ControlLevel = 'hands-on' | 'balanced' | 'independent';
export type RotationFrequency = 'daily' | 'every3' | 'weekly' | 'manual';
export type MissionType = 'permanent' | 'rotating' | 'inactive';
export type DayModeOverride = 'auto' | 'weekday' | 'weekend';

export interface MissionConfig {
  id: number;
  title: string;
  subtitle: string;
  stars: number;
  emoji: string;
  type: MissionType;
}

export interface RewardConfig {
  id: number;
  title: string;
  cost: number;
  emoji: string;
  active: boolean;
}

export interface AppSettings {
  // Child
  childName: string;

  // Security
  parentPin: string;
  pinEnabled: boolean;
  controlLevel: ControlLevel;

  // Buddy behavior
  nudgingEnabled: boolean;       // daily suggestion card
  tinyFactsEnabled: boolean;     // tiny facts during missions (V1.5)
  breathingEnabled: boolean;     // relax with buddy button (V1.5)
  ttsEnabled: boolean;           // text-to-speech
  skipSensitivity: number;       // skips before gentle-reminder (default 2)
  showExactStarCost: boolean;    // show exact cost vs "ещё немного"

  // Mission rotation
  rotationEnabled: boolean;
  rotationFrequency: RotationFrequency;
  rotatingPoolSize: number;      // how many rotating slots shown (1-3)
  missions: MissionConfig[];     // per-mission config

  // Rewards
  rewards: RewardConfig[];

  // Morning routine
  morningEnabled: boolean;
  morningStars: number;          // stars awarded on completion (1-5)
  morningSteps: MorningStep[];   // ordered checklist steps

  // Daily routine — day mode
  weekdayMissionIds: number[];
  weekendMissionIds: number[];
  dayModeOverride: DayModeOverride;

  // Notifications (V1.5 — stored but UI placeholder only)
  morningReminderEnabled: boolean;
  morningReminderTime: string;   // HH:MM

  // Progress / reporting — computed at read time, not stored here
  // (see ProgressSection which reads directly from AsyncStorage)
}

export const DEFAULT_SETTINGS: AppSettings = {
  childName: '',
  parentPin: '',
  pinEnabled: false,
  controlLevel: 'balanced',
  nudgingEnabled: true,
  tinyFactsEnabled: false,
  breathingEnabled: false,
  ttsEnabled: true,
  skipSensitivity: 2,
  showExactStarCost: false,
  rotationEnabled: false,
  rotationFrequency: 'weekly',
  rotatingPoolSize: 2,
  missions: [
    { id: 1, title: 'Постой на одной ноге',   subtitle: 'Держись 5 секунд', stars: 1, emoji: '🦩', type: 'permanent' },
    { id: 2, title: 'Потянись к пальцам ног', subtitle: 'Медленно вниз',    stars: 1, emoji: '🙆', type: 'permanent' },
    { id: 3, title: 'Прыгни три раза',        subtitle: 'Как можно выше',   stars: 1, emoji: '🦘', type: 'rotating' },
    { id: 4, title: 'Выпей стакан воды',      subtitle: 'Не спеши',         stars: 1, emoji: '💧', type: 'permanent' },
    { id: 5, title: 'Убери игрушки',          subtitle: 'Хотя бы один уголок', stars: 2, emoji: '🧸', type: 'rotating' },
    { id: 6, title: 'Обними кого-нибудь',     subtitle: 'Подари тепло',     stars: 2, emoji: '💛', type: 'rotating' },
  ],
  rewards: [
    { id: 1, title: 'Дополнительный мультик',      cost: 3, emoji: '📺', active: true },
    { id: 2, title: 'Выбрать ужин сегодня',         cost: 4, emoji: '🍕', active: true },
    { id: 3, title: 'Лечь спать на 30 минут позже', cost: 5, emoji: '🌙', active: true },
    { id: 4, title: 'Любимый перекус',              cost: 3, emoji: '🍭', active: true },
    { id: 5, title: 'Игра с папой',                 cost: 2, emoji: '🎮', active: true },
  ],
  morningEnabled: true,
  morningStars: 1,
  morningSteps: DEFAULT_MORNING_STEPS,
  weekdayMissionIds: DEFAULT_WEEKDAY_IDS,
  weekendMissionIds: DEFAULT_WEEKEND_IDS,
  dayModeOverride: 'auto' as DayModeOverride,
  morningReminderEnabled: false,
  morningReminderTime: '08:00',
};

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────
// All settings stored as one JSON blob for atomicity.
// Child progress keys (sb_stars_v2 etc.) are read-only here — never written.

const SK = {
  SETTINGS:        'sb_settings_v1',    // full AppSettings JSON
  // Read-only progress keys (for report section)
  STARS:           'sb_stars_v2',
  TOTAL_EVER:      'sb_total_v2',
  TOTAL_MISSIONS:  'sb_total_missions',
  COMPLETED_TODAY: 'sb_today_v2',
  LAST_MISSION:    'sb_last_mission',
  FIRST_REWARD:    'sb_first_reward',
  DEMO_DONE:       'sb_demo_done',
  ONBOARDING_DONE: 'sb_onboarding_done',
  CHILD_NAME:      'sb_child_name',
  PARENT_PIN:      'sb_parent_pin',
  PIN_ENABLED:     'sb_pin_enabled',
};

// ── LOAD / SAVE ───────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SK.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults so new fields added later always have values
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    // First load — pull legacy individual keys if they exist
    const legacy = await AsyncStorage.multiGet([
      SK.CHILD_NAME, SK.PARENT_PIN, SK.PIN_ENABLED,
    ]);
    return {
      ...DEFAULT_SETTINGS,
      childName:  legacy[0][1] ?? '',
      parentPin:  legacy[1][1] ?? '',
      pinEnabled: legacy[2][1] === 'true',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SK.SETTINGS, JSON.stringify(settings));
    // Keep legacy keys in sync for backward compatibility with index.tsx
    await AsyncStorage.multiSet([
      [SK.CHILD_NAME,  settings.childName || ''],
      [SK.PARENT_PIN,  settings.parentPin || ''],
      [SK.PIN_ENABLED, String(settings.pinEnabled)],
    ]);
  } catch (e) {
    // Non-critical persistence error — app will continue but data may be lost
    // User's device storage may be full or permissions issue
  }
}

// ── PROGRESS DATA ─────────────────────────────────────────────────────────────

interface ProgressData {
  stars: number;
  totalEver: number;
  totalMissions: number;
  completedToday: number;
  lastMission: string | null;
  firstRewardRedeemed: boolean;
}

async function loadProgress(): Promise<ProgressData> {
  try {
    const vals = await AsyncStorage.multiGet([
      SK.STARS, SK.TOTAL_EVER, SK.TOTAL_MISSIONS,
      SK.COMPLETED_TODAY, SK.LAST_MISSION, SK.FIRST_REWARD,
    ]);
    const v: Record<string, string> = Object.fromEntries(
      vals.map(([k, val]) => [k, val ?? ''])
    );
    return {
      stars:               v[SK.STARS]          ? parseInt(v[SK.STARS],           10) : 0,
      totalEver:           v[SK.TOTAL_EVER]      ? parseInt(v[SK.TOTAL_EVER],      10) : 0,
      totalMissions:       v[SK.TOTAL_MISSIONS]  ? parseInt(v[SK.TOTAL_MISSIONS],  10) : 0,
      completedToday:      v[SK.COMPLETED_TODAY] ? parseInt(v[SK.COMPLETED_TODAY], 10) : 0,
      lastMission:         v[SK.LAST_MISSION] || null,
      firstRewardRedeemed: v[SK.FIRST_REWARD] === 'true',
    };
  } catch {
    return { stars: 0, totalEver: 0, totalMissions: 0, completedToday: 0, lastMission: null, firstRewardRedeemed: false };
  }
}

// ── COLORS ────────────────────────────────────────────────────────────────────

const C = {
  bg:      '#F7F6F2',
  white:   '#FFFFFF',
  green:   '#1D6B4F',
  greenLt: '#E1F5EE',
  text:    '#1A1A18',
  muted:   '#6B6B68',
  border:  '#E5E5E2',
  gold:    '#FFF8E7',
  goldBdr: '#F59E0B',
  red:     '#E24B4A',
  redLt:   '#FCEBEB',
  track:   '#D8D8D4',
};

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={u.sectionHeader}>
      <Text style={u.sectionIcon}>{icon}</Text>
      <Text style={u.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingRow({
  label, sublabel, children, danger,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <View style={u.row}>
      <View style={u.rowLabels}>
        <Text style={[u.rowLabel, danger && { color: C.red }]}>{label}</Text>
        {sublabel ? <Text style={u.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <View style={u.rowControl}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={u.divider} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={u.card}>{children}</View>;
}

function PillSelector<T extends string>({
  options, value, onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={u.pillRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          style={[u.pill, o.value === value && u.pillActive]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[u.pillTxt, o.value === value && u.pillTxtActive]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── PROGRESS SECTION ──────────────────────────────────────────────────────────

function ProgressSection({ progress }: { progress: ProgressData }) {
  const { totalEver, totalMissions, completedToday, stars, lastMission } = progress;

  const statCards = [
    { label: 'Звёзд всего',    value: String(totalEver),    emoji: '⭐' },
    { label: 'Миссий всего',   value: String(totalMissions), emoji: '🎯' },
    { label: 'Сегодня',        value: String(completedToday), emoji: '📅' },
    { label: 'Осталось звёзд', value: String(stars),         emoji: '💰' },
  ];

  return (
    <View>
      <SectionHeader title="Отчёт о прогрессе" icon="📊" />
      <View style={u.statsGrid}>
        {statCards.map(sc => (
          <View key={sc.label} style={u.statCard}>
            <Text style={u.statEmoji}>{sc.emoji}</Text>
            <Text style={u.statValue}>{sc.value}</Text>
            <Text style={u.statLabel}>{sc.label}</Text>
          </View>
        ))}
      </View>
      {lastMission && (
        <Card>
          <Text style={u.lastMissionLabel}>Последняя выполненная миссия</Text>
          <Text style={u.lastMissionValue}>{lastMission}</Text>
        </Card>
      )}
      {totalMissions === 0 && (
        <Card>
          <Text style={[u.rowSublabel, { textAlign: 'center', padding: 8 }]}>
            Миссии ещё не выполнялись. Статистика появится здесь.
          </Text>
        </Card>
      )}
    </View>
  );
}

// ── PIN SECTION ───────────────────────────────────────────────────────────────

function PinSection({
  settings, onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin,     setNewPin]     = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  function handleSetPin() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('PIN должен быть 4 цифры');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('PIN не совпадает');
      return;
    }
    onChange({ parentPin: newPin, pinEnabled: true });
    setShowSetPin(false);
    setNewPin('');
    setConfirmPin('');
    Alert.alert('PIN установлен');
  }

  function handleRemovePin() {
    Alert.alert('Удалить PIN?', 'Защита наград будет отключена', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: () => onChange({ parentPin: '', pinEnabled: false }),
      },
    ]);
  }

  return (
    <View>
      <SectionHeader title="Безопасность" icon="🔒" />
      <Card>
        <SettingRow
          label="PIN для наград"
          sublabel="Ребёнок не сможет получить награду без родителя"
        >
          <Switch
            value={settings.pinEnabled}
            onValueChange={v => {
              if (v && !settings.parentPin) {
                setShowSetPin(true);
              } else {
                onChange({ pinEnabled: v });
              }
            }}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>

        {settings.pinEnabled && settings.parentPin ? (
          <>
            <Divider />
            <SettingRow label="Изменить PIN" sublabel="PIN установлен">
              <TouchableOpacity onPress={() => setShowSetPin(true)} style={u.linkBtn}>
                <Text style={u.linkBtnTxt}>Изменить</Text>
              </TouchableOpacity>
            </SettingRow>
            <Divider />
            <SettingRow label="Удалить PIN" danger>
              <TouchableOpacity onPress={handleRemovePin} style={u.dangerBtn}>
                <Text style={u.dangerBtnTxt}>Удалить</Text>
              </TouchableOpacity>
            </SettingRow>
          </>
        ) : null}

        {!settings.pinEnabled || !settings.parentPin ? (
          <>
            <Divider />
            <TouchableOpacity style={u.inlineAction} onPress={() => setShowSetPin(true)}>
              <Text style={u.inlineActionTxt}>Установить PIN →</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </Card>

      {showSetPin && (
        <Card>
          <Text style={u.subheading}>Новый PIN (4 цифры)</Text>
          <TextInput
            style={u.pinInput}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            placeholder="····"
            placeholderTextColor={C.muted}
            value={newPin}
            onChangeText={setNewPin}
          />
          <Text style={u.subheading}>Повтори PIN</Text>
          <TextInput
            style={u.pinInput}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            placeholder="····"
            placeholderTextColor={C.muted}
            value={confirmPin}
            onChangeText={setConfirmPin}
          />
          <View style={u.rowBtns}>
            <TouchableOpacity style={u.btnPrimary} onPress={handleSetPin}>
              <Text style={u.btnPrimaryTxt}>Сохранить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={u.btnCancel} onPress={() => {
              setShowSetPin(false); setNewPin(''); setConfirmPin('');
            }}>
              <Text style={u.btnCancelTxt}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <Card>
        <Text style={u.rowLabel}>Уровень контроля</Text>
        <Text style={[u.rowSublabel, { marginBottom: 10 }]}>
          {settings.controlLevel === 'hands-on'
            ? 'Родитель подтверждает каждую награду'
            : settings.controlLevel === 'balanced'
            ? 'Стандартный режим — минимальное участие родителя'
            : 'Ребёнок действует самостоятельно'}
        </Text>
        <PillSelector
          options={[
            { label: 'Вместе',      value: 'hands-on' },
            { label: 'Стандарт',   value: 'balanced' },
            { label: 'Сам',        value: 'independent' },
          ]}
          value={settings.controlLevel}
          onChange={v => onChange({ controlLevel: v })}
        />
      </Card>
    </View>
  );
}

// ── MISSIONS SECTION ──────────────────────────────────────────────────────────

function MissionsSection({
  settings, onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const TYPE_LABELS: Record<MissionType, string> = {
    permanent: 'Всегда',
    rotating:  'Ротация',
    inactive:  'Выкл',
  };
  const TYPE_COLORS: Record<MissionType, string> = {
    permanent: C.green,
    rotating:  '#854F0B',
    inactive:  C.muted,
  };

  function cycleType(id: number) {
    const order: MissionType[] = ['permanent', 'rotating', 'inactive'];
    const updated = settings.missions.map(m => {
      if (m.id !== id) return m;
      const next = order[(order.indexOf(m.type) + 1) % order.length];
      return { ...m, type: next };
    });
    onChange({ missions: updated });
  }

  return (
    <View>
      <SectionHeader title="Миссии" icon="🎯" />
      <Card>
        {settings.missions.map((m, idx) => (
          <View key={m.id}>
            {idx > 0 && <Divider />}
            <View style={u.missionRow}>
              <Text style={u.missionEmoji}>{m.emoji}</Text>
              <View style={u.missionInfo}>
                <Text style={u.missionTitle}>{m.title}</Text>
                <Text style={u.missionSub}>{m.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={[u.typePill, { borderColor: TYPE_COLORS[m.type] }]}
                onPress={() => cycleType(m.id)}
              >
                <Text style={[u.typePillTxt, { color: TYPE_COLORS[m.type] }]}>
                  {TYPE_LABELS[m.type]}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <Divider />
        <Text style={[u.rowSublabel, { padding: 8, textAlign: 'center' }]}>
          Нажми на тип, чтобы переключить: Всегда → Ротация → Выкл
        </Text>
      </Card>

      <Card>
        <SettingRow
          label="Ротация задач 🔜"
          sublabel="Задачи меняются по расписанию (скоро)"
        >
          <Switch
            value={false}
            disabled
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
      </Card>
    </View>
  );
}

// ── REWARDS SECTION ───────────────────────────────────────────────────────────

function RewardsSection({
  settings, onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCost,  setEditCost]  = useState('');

  function startEdit(r: RewardConfig) {
    setEditingId(r.id);
    setEditTitle(r.title);
    setEditCost(String(r.cost));
  }

  function saveEdit() {
    const cost = parseInt(editCost, 10);
    if (!editTitle.trim() || isNaN(cost) || cost < 1 || cost > 20) {
      Alert.alert('Проверь название и стоимость (1-20 звёзд)');
      return;
    }
    const updated = settings.rewards.map(r =>
      r.id === editingId ? { ...r, title: editTitle.trim(), cost } : r
    );
    onChange({ rewards: updated });
    setEditingId(null);
  }

  function toggleReward(id: number) {
    const updated = settings.rewards.map(r =>
      r.id === id ? { ...r, active: !r.active } : r
    );
    onChange({ rewards: updated });
  }

  return (
    <View>
      <SectionHeader title="Награды" icon="🎁" />
      <Card>
        {settings.rewards.map((r, idx) => (
          <View key={r.id}>
            {idx > 0 && <Divider />}
            {editingId === r.id ? (
              <View style={u.editBlock}>
                <TextInput
                  style={u.editInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Название награды"
                  placeholderTextColor={C.muted}
                />
                <View style={u.editCostRow}>
                  <Text style={u.rowSublabel}>Стоимость (⭐):</Text>
                  <TextInput
                    style={[u.editInput, { width: 60, textAlign: 'center', marginLeft: 8 }]}
                    value={editCost}
                    onChangeText={setEditCost}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={u.rowBtns}>
                  <TouchableOpacity style={u.btnPrimary} onPress={saveEdit}>
                    <Text style={u.btnPrimaryTxt}>Сохранить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={u.btnCancel} onPress={() => setEditingId(null)}>
                    <Text style={u.btnCancelTxt}>Отмена</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[u.missionRow, !r.active && { opacity: 0.45 }]}>
                <Text style={u.missionEmoji}>{r.emoji}</Text>
                <View style={u.missionInfo}>
                  <Text style={u.missionTitle}>{r.title}</Text>
                  <Text style={u.missionSub}>{Array(r.cost).fill('⭐').join('')}</Text>
                </View>
                <TouchableOpacity style={u.linkBtn} onPress={() => startEdit(r)}>
                  <Text style={u.linkBtnTxt}>Изменить</Text>
                </TouchableOpacity>
                <Switch
                  value={r.active}
                  onValueChange={() => toggleReward(r.id)}
                  trackColor={{ false: C.track, true: C.green }}
                  thumbColor={C.white}
                  style={{ marginLeft: 8 }}
                />
              </View>
            )}
          </View>
        ))}
      </Card>
    </View>
  );
}

// ── BUDDY BEHAVIOR SECTION ────────────────────────────────────────────────────

function BuddySection({
  settings, onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  return (
    <View>
      <SectionHeader title="Поведение Бадди" icon="🐻" />
      <Card>
        <SettingRow label="Голос (TTS)" sublabel="Бадди читает текст вслух">
          <Switch
            value={settings.ttsEnabled}
            onValueChange={v => onChange({ ttsEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow label="Ежедневная подсказка" sublabel="Карточка с предложением задания на главном экране">
          <Switch
            value={settings.nudgingEnabled}
            onValueChange={v => onChange({ nudgingEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label="Реакция на пропуски"
          sublabel={`Бадди меняется после ${settings.skipSensitivity} пропусков подряд`}
        >
          <View style={u.stepperRow}>
            <TouchableOpacity
              style={u.stepperBtn}
              onPress={() => onChange({ skipSensitivity: Math.max(1, settings.skipSensitivity - 1) })}
            >
              <Text style={u.stepperTxt}>−</Text>
            </TouchableOpacity>
            <Text style={u.stepperVal}>{settings.skipSensitivity}</Text>
            <TouchableOpacity
              style={u.stepperBtn}
              onPress={() => onChange({ skipSensitivity: Math.min(5, settings.skipSensitivity + 1) })}
            >
              <Text style={u.stepperTxt}>+</Text>
            </TouchableOpacity>
          </View>
        </SettingRow>
        <Divider />
        <SettingRow
          label="Показывать точную стоимость"
          sublabel={settings.showExactStarCost
            ? 'Ребёнок видит «нужно ещё 2 ⭐»'
            : 'Ребёнок видит «ещё немного»'}
        >
          <Switch
            value={settings.showExactStarCost}
            onValueChange={v => onChange({ showExactStarCost: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        {/* V1.5 placeholders — shown but disabled with coming-soon badge */}
        <SettingRow
          label="Интересные факты 🔜"
          sublabel="Бадди делится фактами во время миссий (скоро)"
        >
          <Switch
            value={false}
            disabled
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label="Дыхательные упражнения 🔜"
          sublabel="Кнопка «Расслабься с Бадди» (скоро)"
        >
          <Switch
            value={false}
            disabled
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
      </Card>
    </View>
  );
}

// ── CHILD SECTION ─────────────────────────────────────────────────────────────

function ChildSection({
  settings, onChange, onResetProgress,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onResetProgress: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(settings.childName);

  function saveName() {
    if (!nameInput.trim()) { Alert.alert('Введи имя'); return; }
    onChange({ childName: nameInput.trim() });
    setEditingName(false);
  }

  return (
    <View>
      <SectionHeader title="Профиль ребёнка" icon="👤" />
      <Card>
        {editingName ? (
          <View style={u.editBlock}>
            <TextInput
              style={u.editInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Имя ребёнка"
              placeholderTextColor={C.muted}
              autoFocus
            />
            <View style={u.rowBtns}>
              <TouchableOpacity style={u.btnPrimary} onPress={saveName}>
                <Text style={u.btnPrimaryTxt}>Сохранить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={u.btnCancel} onPress={() => setEditingName(false)}>
                <Text style={u.btnCancelTxt}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <SettingRow label="Имя" sublabel={settings.childName || '—'}>
            <TouchableOpacity onPress={() => { setNameInput(settings.childName); setEditingName(true); }} style={u.linkBtn}>
              <Text style={u.linkBtnTxt}>Изменить</Text>
            </TouchableOpacity>
          </SettingRow>
        )}
        <Divider />
        <SettingRow
          label="Сбросить прогресс"
          sublabel="Звёзды, миссии и награды будут обнулены"
          danger
        >
          <TouchableOpacity style={u.dangerBtn} onPress={onResetProgress}>
            <Text style={u.dangerBtnTxt}>Сброс</Text>
          </TouchableOpacity>
        </SettingRow>
      </Card>
    </View>
  );
}


// ── DAILY ROUTINE SECTION ─────────────────────────────────────────────────────

function DailyRoutineSection({
  settings, onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [stepTitle, setStepTitle]   = useState('');
  const [stepEmoji, setStepEmoji]   = useState('');

  const weekdayIds = settings.weekdayMissionIds ?? DEFAULT_WEEKDAY_IDS;
  const weekendIds = settings.weekendMissionIds ?? DEFAULT_WEEKEND_IDS;

  // Move a morning step up or down by index offset (-1 or +1)
  function moveStep(id: number, dir: -1 | 1) {
    const steps = [...settings.morningSteps];
    const idx   = steps.findIndex(s => s.id === id);
    const swap  = idx + dir;
    if (swap < 0 || swap >= steps.length) return;
    [steps[idx], steps[swap]] = [steps[swap], steps[idx]];
    onChange({ morningSteps: steps });
  }

  function saveStep() {
    if (!stepTitle.trim()) return;
    if (editingId === -1) {
      const newId = Math.max(0, ...settings.morningSteps.map(s => s.id)) + 1;
      onChange({ morningSteps: [...settings.morningSteps,
        { id: newId, title: stepTitle.trim(), emoji: stepEmoji || '✅' }] });
    } else {
      onChange({ morningSteps: settings.morningSteps.map(s =>
        s.id === editingId ? { ...s, title: stepTitle.trim(), emoji: stepEmoji || s.emoji } : s
      )});
    }
    setEditingId(null); setStepTitle(''); setStepEmoji('');
  }

  function deleteStep(id: number) {
    onChange({ morningSteps: settings.morningSteps.filter(s => s.id !== id) });
  }

  function toggleMission(id: number, mode: 'weekday' | 'weekend') {
    const key = mode === 'weekday' ? 'weekdayMissionIds' : 'weekendMissionIds';
    const cur = mode === 'weekday' ? weekdayIds : weekendIds;
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    onChange({ [key]: next });
  }

  return (
    <View>
      <SectionHeader title="Распорядок дня" icon="🌅" />

      {/* Morning routine toggle + star count + steps editor */}
      <Card>
        <SettingRow label="Утренняя рутина" sublabel="При первом открытии до 12:00">
          <Switch
            value={settings.morningEnabled}
            onValueChange={v => onChange({ morningEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>

        {settings.morningEnabled && (
          <>
            <Divider />
            <SettingRow label="Звёзд за рутину" sublabel="За весь комплект шагов">
              <View style={u.stepperRow}>
                <TouchableOpacity style={u.stepperBtn} onPress={() => onChange({ morningStars: Math.max(1, settings.morningStars - 1) })}>
                  <Text style={u.stepperTxt}>−</Text>
                </TouchableOpacity>
                <Text style={u.stepperVal}>{settings.morningStars}</Text>
                <TouchableOpacity style={u.stepperBtn} onPress={() => onChange({ morningStars: Math.min(5, settings.morningStars + 1) })}>
                  <Text style={u.stepperTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </SettingRow>

            <Divider />
            <Text style={u.subheading}>Шаги утренней рутины</Text>

            {settings.morningSteps.map((step, idx) => (
              <View key={step.id}>
                {idx > 0 && <Divider />}
                {editingId === step.id ? (
                  <View style={u.editBlock}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput style={[u.editInput, { width: 52 }]} value={stepEmoji} onChangeText={setStepEmoji} placeholder="🌟" placeholderTextColor={C.muted} />
                      <TextInput style={[u.editInput, { flex: 1 }]} value={stepTitle} onChangeText={setStepTitle} placeholder="Название шага" placeholderTextColor={C.muted} autoFocus />
                    </View>
                    <View style={u.rowBtns}>
                      <TouchableOpacity style={u.btnPrimary} onPress={saveStep}><Text style={u.btnPrimaryTxt}>Сохранить</Text></TouchableOpacity>
                      <TouchableOpacity style={u.btnCancel} onPress={() => { setEditingId(null); setStepTitle(''); setStepEmoji(''); }}><Text style={u.btnCancelTxt}>Отмена</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={u.row}>
                    <Text style={{ fontSize: 22, marginRight: 10 }}>{step.emoji}</Text>
                    <Text style={[u.rowLabel, { flex: 1 }]}>{step.title}</Text>
                    <TouchableOpacity style={u.stepperBtn} onPress={() => moveStep(step.id, -1)} disabled={idx === 0}>
                      <Text style={[u.stepperTxt, idx === 0 && { opacity: 0.25 }]}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[u.stepperBtn, { marginLeft: 4 }]} onPress={() => moveStep(step.id, 1)} disabled={idx === settings.morningSteps.length - 1}>
                      <Text style={[u.stepperTxt, idx === settings.morningSteps.length - 1 && { opacity: 0.25 }]}>↓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[u.linkBtn, { marginLeft: 4 }]} onPress={() => { setEditingId(step.id); setStepTitle(step.title); setStepEmoji(step.emoji); }}>
                      <Text style={u.linkBtnTxt}>Изм.</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={u.dangerBtn} onPress={() => deleteStep(step.id)}>
                      <Text style={u.dangerBtnTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {settings.morningSteps.length < 6 && editingId !== -1 && (
              <>
                <Divider />
                <TouchableOpacity style={u.inlineAction} onPress={() => { setEditingId(-1); setStepTitle(''); setStepEmoji(''); }}>
                  <Text style={u.inlineActionTxt}>+ Добавить шаг</Text>
                </TouchableOpacity>
              </>
            )}
            {editingId === -1 && (
              <View style={u.editBlock}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[u.editInput, { width: 52 }]} value={stepEmoji} onChangeText={setStepEmoji} placeholder="🌟" placeholderTextColor={C.muted} />
                  <TextInput style={[u.editInput, { flex: 1 }]} value={stepTitle} onChangeText={setStepTitle} placeholder="Название шага" placeholderTextColor={C.muted} autoFocus />
                </View>
                <View style={u.rowBtns}>
                  <TouchableOpacity style={u.btnPrimary} onPress={saveStep}><Text style={u.btnPrimaryTxt}>Добавить</Text></TouchableOpacity>
                  <TouchableOpacity style={u.btnCancel} onPress={() => { setEditingId(null); setStepTitle(''); setStepEmoji(''); }}><Text style={u.btnCancelTxt}>Отмена</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </Card>

      {/* Day mode override */}
      <Card>
        <Text style={[u.rowLabel, { padding: 14, paddingBottom: 4 }]}>Режим дня</Text>
        <Text style={[u.rowSublabel, { paddingHorizontal: 14, paddingBottom: 8 }]}>
          {(settings.dayModeOverride ?? 'auto') === 'auto'
            ? 'Авто — будни / выходные по дате'
            : settings.dayModeOverride === 'weekday'
            ? 'Всегда режим буднего дня'
            : 'Всегда режим выходного дня'}
        </Text>
        <PillSelector
          options={[
            { label: 'Авто',     value: 'auto'    },
            { label: 'Будни',    value: 'weekday' },
            { label: 'Выходной', value: 'weekend' },
          ]}
          value={settings.dayModeOverride ?? 'auto'}
          onChange={v => onChange({ dayModeOverride: v as DayModeOverride })}
        />
      </Card>

      {/* Weekday mission selection */}
      <Card>
        <Text style={u.subheading}>Миссии в будни</Text>
        {MISSION_POOL.map((m, idx) => (
          <View key={m.id}>
            {idx > 0 && <Divider />}
            <View style={u.row}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={u.rowLabel}>{m.title}</Text>
                <Text style={u.rowSublabel}>{m.subtitle}</Text>
              </View>
              <Switch
                value={weekdayIds.includes(m.id)}
                onValueChange={() => toggleMission(m.id, 'weekday')}
                trackColor={{ false: C.track, true: C.green }}
                thumbColor={C.white}
              />
            </View>
          </View>
        ))}
      </Card>

      {/* Weekend mission selection */}
      <Card>
        <Text style={u.subheading}>Миссии в выходные</Text>
        {MISSION_POOL.map((m, idx) => (
          <View key={m.id}>
            {idx > 0 && <Divider />}
            <View style={u.row}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={u.rowLabel}>{m.title}</Text>
                <Text style={u.rowSublabel}>{m.subtitle}</Text>
              </View>
              <Switch
                value={weekendIds.includes(m.id)}
                onValueChange={() => toggleMission(m.id, 'weekend')}
                trackColor={{ false: C.track, true: C.green }}
                thumbColor={C.white}
              />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

// ── NOTIFICATIONS SECTION (placeholder) ───────────────────────────────────────

function NotificationsSection({ settings, onChange }: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  return (
    <View>
      <SectionHeader title="Уведомления 🔜" icon="🔔" />
      <Card>
        <SettingRow
          label="Утреннее напоминание"
          sublabel="Бадди напомнит о миссиях утром (скоро)"
        >
          <Switch
            value={false}
            disabled
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
      </Card>
    </View>
  );
}

// ── MAIN SETTINGS SCREEN ──────────────────────────────────────────────────────

interface SettingsScreenProps {
  onClose: () => void;
  // Called whenever settings change so index.tsx can update its own state
  onSettingsChange: (settings: AppSettings) => void;
  // Optional: pass current PIN for protected reset
  currentPin?: string;
  pinEnabled?: boolean;
}

export default function SettingsScreen({
  onClose,
  onSettingsChange,
  currentPin = '',
  pinEnabled = false,
}: SettingsScreenProps) {
  const [settings,  setSettings]  = useState<AppSettings>(DEFAULT_SETTINGS);
  const [progress,  setProgress]  = useState<ProgressData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [pinInput,  setPinInput]  = useState('');
  const [showPin,   setShowPin]   = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    Promise.all([loadSettings(), loadProgress()]).then(([s, p]) => {
      setSettings(s);
      setProgress(p);
      setLoading(false);
    });
  }, []);

  // Auto-save with debounce — 800ms after last change
  function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    onSettingsChange(next); // notify parent immediately for live updates
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSettings(next), 800);
  }

  // PIN-protected action (reset progress)
  function requirePin(action: () => void) {
    if (pinEnabled && currentPin) {
      setPendingAction(() => action);
      setPinInput('');
      setShowPin(true);
    } else {
      action();
    }
  }

  function verifyAndRun() {
    if (pinInput === currentPin) {
      setShowPin(false);
      pendingAction?.();
      setPendingAction(null);
    } else {
      Alert.alert('Неверный PIN');
      setPinInput('');
    }
  }

  function handleResetProgress() {
    requirePin(() => {
      Alert.alert(
        'Сбросить весь прогресс?',
        'Звёзды, миссии и история будут удалены. Настройки сохранятся.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Сбросить', style: 'destructive',
            onPress: async () => {
              await AsyncStorage.multiSet([
                [SK.STARS,           '0'],
                ['sb_total_v2',      '0'],
                ['sb_total_missions','0'],
                ['sb_today_v2',      '0'],
                ['sb_last_mission',  ''],
                ['sb_first_reward',  'false'],
                ['sb_skip_count',    '0'],
              ]);
              setProgress({ stars: 0, totalEver: 0, totalMissions: 0, completedToday: 0, lastMission: null, firstRewardRedeemed: false });
              Alert.alert('Прогресс сброшен');
            },
          },
        ]
      );
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={ss.root}>
        <View style={ss.loadingCenter}>
          <Text style={ss.loadingText}>Загрузка настроек...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ss.root}>
      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={onClose} style={ss.backBtn}>
          <Text style={ss.backBtnTxt}>← Назад</Text>
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Настройки</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        style={ss.scroll}
        contentContainerStyle={ss.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress report — high priority, first */}
        {progress && <ProgressSection progress={progress} />}

        <View style={ss.spacer} />

        {/* Child profile */}
        <ChildSection
          settings={settings}
          onChange={updateSettings}
          onResetProgress={handleResetProgress}
        />

        <View style={ss.spacer} />

        {/* Security */}
        <PinSection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Missions */}
        <MissionsSection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Rewards */}
        <RewardsSection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Daily routine */}
        <DailyRoutineSection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Buddy behavior */}
        <BuddySection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Notifications (placeholder) */}
        <NotificationsSection settings={settings} onChange={updateSettings} />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PIN overlay for protected actions */}
      {showPin && (
        <View style={ss.pinOverlay}>
          <View style={ss.pinCard}>
            <Text style={ss.pinTitle}>Введи PIN родителя</Text>
            <TextInput
              style={ss.pinInput}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={pinInput}
              onChangeText={setPinInput}
              autoFocus
              onSubmitEditing={verifyAndRun}
            />
            <TouchableOpacity style={ss.pinBtnPrimary} onPress={verifyAndRun}>
              <Text style={ss.pinBtnPrimaryTxt}>Подтвердить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ss.pinBtnCancel}
              onPress={() => { setShowPin(false); setPinInput(''); setPendingAction(null); }}
            >
              <Text style={ss.pinBtnCancelTxt}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  loadingCenter:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:  { fontSize: 16, color: C.muted },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderColor: C.border, backgroundColor: C.white },
  headerTitle:  { fontSize: 17, fontWeight: '600', color: C.text },
  backBtn:      { paddingVertical: 4, paddingHorizontal: 8 },
  backBtnTxt:   { fontSize: 15, color: C.green, fontWeight: '500' },
  scroll:       { flex: 1 },
  content:      { padding: 16 },
  spacer:       { height: 24 },
  pinOverlay:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pinCard:          { backgroundColor: C.white, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%' },
  pinTitle:         { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 16 },
  pinInput:         { fontSize: 28, textAlign: 'center', letterSpacing: 8, marginBottom: 24, width: '100%', height: 52, borderBottomWidth: 2, borderColor: C.border, paddingBottom: 8, color: C.text },
  pinBtnPrimary:    { backgroundColor: C.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', width: '100%', marginBottom: 10 },
  pinBtnPrimaryTxt: { fontSize: 15, color: C.white, fontWeight: '600' },
  pinBtnCancel:     { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 14, alignItems: 'center', width: '100%' },
  pinBtnCancelTxt:  { fontSize: 15, color: C.text, fontWeight: '500' },
});

const u = StyleSheet.create({
  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionIcon:   { fontSize: 18 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: C.text, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card:          { backgroundColor: C.white, borderRadius: 14, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden', marginBottom: 8 },

  // Row
  row:           { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowLabels:     { flex: 1 },
  rowLabel:      { fontSize: 14, fontWeight: '500', color: C.text },
  rowSublabel:   { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
  rowControl:    { alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 },
  subheading:    { fontSize: 13, fontWeight: '500', color: C.muted, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },

  divider:       { height: 0.5, backgroundColor: C.border, marginHorizontal: 14 },

  // Pill selector
  pillRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 14, paddingTop: 8 },
  pill:          { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  pillActive:    { backgroundColor: C.green, borderColor: C.green },
  pillTxt:       { fontSize: 13, color: C.muted, fontWeight: '500' },
  pillTxtActive: { color: C.white },

  // Stepper
  stepperRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn:    { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  stepperTxt:    { fontSize: 18, color: C.green, fontWeight: '600', lineHeight: 22 },
  stepperVal:    { fontSize: 16, fontWeight: '600', color: C.text, minWidth: 24, textAlign: 'center' },

  // Mission rows
  missionRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  missionEmoji:  { fontSize: 26 },
  missionInfo:   { flex: 1 },
  missionTitle:  { fontSize: 13, fontWeight: '600', color: C.text },
  missionSub:    { fontSize: 11, color: C.muted, marginTop: 1 },
  typePill:      { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  typePillTxt:   { fontSize: 11, fontWeight: '600' },

  // Buttons
  btnPrimary:    { backgroundColor: C.green, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', flex: 1 },
  btnPrimaryTxt: { fontSize: 14, color: C.white, fontWeight: '600' },
  btnCancel:     { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', flex: 1 },
  btnCancelTxt:  { fontSize: 14, color: C.muted, fontWeight: '500' },
  dangerBtn:     { backgroundColor: C.redLt, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },
  dangerBtnTxt:  { fontSize: 13, color: C.red, fontWeight: '600' },
  linkBtn:       { paddingVertical: 4, paddingHorizontal: 10 },
  linkBtnTxt:    { fontSize: 13, color: C.green, fontWeight: '500' },
  inlineAction:  { padding: 14, alignItems: 'center' },
  inlineActionTxt: { fontSize: 14, color: C.green, fontWeight: '500' },
  rowBtns:       { flexDirection: 'row', gap: 10, marginTop: 12 },

  // Edit block
  editBlock:     { padding: 14 },
  editInput:     { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 14, color: C.text, backgroundColor: C.bg, marginBottom: 8 },
  editCostRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },

  // Progress stats
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statCard:      { flex: 1, minWidth: '45%', backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 14, alignItems: 'center' },
  statEmoji:     { fontSize: 22, marginBottom: 4 },
  statValue:     { fontSize: 26, fontWeight: '700', color: C.green },
  statLabel:     { fontSize: 11, color: C.muted, marginTop: 2, textAlign: 'center' },
  lastMissionLabel: { fontSize: 12, color: C.muted, marginBottom: 4, padding: 14, paddingBottom: 0 },
  lastMissionValue: { fontSize: 14, fontWeight: '500', color: C.text, padding: 14, paddingTop: 4 },

  // PIN
  pinInput:      { fontSize: 32, textAlign: 'center', letterSpacing: 12, marginBottom: 20, width: '100%', borderBottomWidth: 2, borderColor: C.border, paddingBottom: 8, color: C.text },
});