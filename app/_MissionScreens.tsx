// _MissionScreens.tsx — SafeBuddy mission and reward screens
// MissionPickScreen: slot-grouped, current slot first.
// ActiveScreen, CelebrateScreen, RewardsScreen: unchanged logic.

import React from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { T } from "./_SharedUI";
import {
  BUDDY_FIXED_SPACER,
  C,
  currentSlot,
  getMilestoneMessage,
  getMissionSubtitle,
  getMissionTitle,
  getProgressionMessage,
  getRewardTitle,
  MISSION_POOL,
  MissionSlot,
  PoolMission,
  REWARDS,
} from "./_constants";
import { RtlChildSex, t, tGender, tSpeak } from "./i18n";

// ── SLOT META ─────────────────────────────────────────────────────────────────

const SLOT_LABEL_KEYS: Record<MissionSlot, string> = {
  morning: "missionPick.slot_morning",
  afternoon: "missionPick.slot_afternoon",
  evening: "missionPick.slot_evening",
  any: "missionPick.slot_any",
};

const SLOT_COLORS: Record<MissionSlot, { bg: string; border: string }> = {
  morning: { bg: C.slotMorning, border: C.slotMorningBdr },
  afternoon: { bg: C.slotAfternoon, border: C.slotAfternoonBdr },
  evening: { bg: C.slotEvening, border: C.slotEveningBdr },
  any: { bg: C.bg, border: C.border },
};

const SLOT_ORDER: MissionSlot[] = ["morning", "afternoon", "evening", "any"];

// ── MissionPickScreen ─────────────────────────────────────────────────────────

interface MissionPickProps {
  onPick: (m: any) => void;
  onBack: () => void;
  speak: (t: string) => void;
  firstTime: boolean;
  missions?: PoolMission[] | null;
  doneIds?: number[];
  bonusMission?: PoolMission | null;
  missionTypeById?: Record<number, "permanent" | "rotating" | "inactive">;
  rtlChildSex?: RtlChildSex;
}

export function MissionPickScreen({
  onPick,
  onBack,
  speak,
  firstTime,
  missions,
  doneIds,
  bonusMission,
  missionTypeById,
  rtlChildSex = "male",
}: MissionPickProps) {
  const pool = !missions || missions.length === 0 ? MISSION_POOL : missions;

  const done = new Set<number>(doneIds ?? []);
  const remaining = pool.filter((m) => !done.has(m.id)).length;
  const allDone = pool.length > 0 && remaining === 0;
  const showBonus = allDone && !!bonusMission && !done.has(bonusMission.id);

  const active = currentSlot();
  const orderedSlots = [
    active,
    ...SLOT_ORDER.filter((s) => s !== active),
  ] as MissionSlot[];

  const grouped: Record<MissionSlot, PoolMission[]> = {
    morning: pool.filter((m) => m.slot === "morning"),
    afternoon: pool.filter((m) => m.slot === "afternoon"),
    evening: pool.filter((m) => m.slot === "evening"),
    any: pool.filter((m) => m.slot === "any"),
  };

  const [expanded, setExpanded] = React.useState<MissionSlot>(active);

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={{ height: BUDDY_FIXED_SPACER }} />
      <T style={s.pageTitle} speak={speak}>
        {tGender("missionPick.title", undefined, rtlChildSex)}
      </T>

      {allDone && (
        <View style={s.encoreCard}>
          <Text style={s.encoreEmoji}>🌙</Text>
          <T style={s.encoreTitle} speak={speak}>
            {tGender("missionPick.encore_title", undefined, rtlChildSex)}
          </T>
          <T style={s.encoreSub} speak={speak}>
            {tGender("missionPick.encore_sub", undefined, rtlChildSex)}
          </T>
          {showBonus && bonusMission && (
            <>
              <T style={s.encoreBonusLabel} speak={speak}>
                {tGender("missionPick.encore_bonus", undefined, rtlChildSex)}
              </T>
              <TouchableOpacity
                style={[s.mCard, s.bonusCard]}
                onPress={() => onPick(bonusMission)}
                onLongPress={() =>
                  speak(
                    `${getMissionTitle(bonusMission.id, bonusMission.title)}. ${getMissionSubtitle(bonusMission.id, bonusMission.subtitle)}`,
                  )
                }
              >
                <Text style={s.mEmoji}>{bonusMission.emoji}</Text>
                <View style={s.mInfo}>
                  <Text style={s.mTitle}>
                    {getMissionTitle(bonusMission.id, bonusMission.title)}
                  </Text>
                  <Text style={s.mSub}>
                    {getMissionSubtitle(bonusMission.id, bonusMission.subtitle)}
                  </Text>
                </View>
                <Text style={s.mStar}>
                  {Array(bonusMission.stars).fill("⭐").join("")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {orderedSlots.map((slot) => {
        const items = grouped[slot];
        if (items.length === 0) return null;
        const isOpen = expanded === slot;
        const colors = SLOT_COLORS[slot];
        const slotDone = items.filter((m) => done.has(m.id)).length;

        return (
          <View key={slot} style={s.slotSection}>
            <TouchableOpacity
              style={[
                s.slotHeader,
                { backgroundColor: colors.bg, borderColor: colors.border },
              ]}
              onPress={() => setExpanded(isOpen ? "any" : slot)}
              activeOpacity={0.7}
            >
              <Text style={s.slotLabel}>{t(SLOT_LABEL_KEYS[slot])}</Text>
              <View style={s.slotMeta}>
                <Text style={s.slotCount}>
                  {slotDone}/{items.length}
                </Text>
                <Text style={s.slotChevron}>{isOpen ? "▲" : "▼"}</Text>
              </View>
            </TouchableOpacity>

            {isOpen &&
              items.map((m) => {
                const isDone = done.has(m.id);
                const mType = missionTypeById?.[m.id];
                const tintStyle =
                  mType === "permanent"
                    ? s.mCardPermanent
                    : mType === "rotating"
                      ? s.mCardRotating
                      : null;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      s.mCard,
                      tintStyle,
                      m.stars >= 2 && s.mCardBig,
                      isDone && s.mCardDone,
                    ]}
                    onPress={() => {
                      if (!isDone) onPick(m);
                      else
                        speak(
                          tSpeak(
                            "missionPick.already_done",
                            {
                              title: getMissionTitle(m.id, m.title),
                            },
                            rtlChildSex,
                          ),
                        );
                    }}
                    onLongPress={() =>
                      speak(
                        `${getMissionTitle(m.id, m.title)}. ${getMissionSubtitle(m.id, m.subtitle)}`,
                      )
                    }
                    activeOpacity={isDone ? 1 : 0.7}
                  >
                    <Text style={[s.mEmoji, isDone && s.mEmojiDone]}>
                      {m.emoji}
                    </Text>
                    <View style={s.mInfo}>
                      <Text style={[s.mTitle, isDone && s.mTxtDone]}>
                        {getMissionTitle(m.id, m.title)}
                      </Text>
                      <Text style={[s.mSub, isDone && s.mTxtDone]}>
                        {getMissionSubtitle(m.id, m.subtitle)}
                      </Text>
                      {!isDone && mType === "permanent" && (
                        <View style={[s.typePill, s.typePillPermanent]}>
                          <Text style={s.typePillTxtPermanent}>
                            {t("missionPick.type_permanent")}
                          </Text>
                        </View>
                      )}
                      {!isDone && mType === "rotating" && (
                        <View style={[s.typePill, s.typePillRotating]}>
                          <Text style={s.typePillTxtRotating}>
                            {t("missionPick.type_rotating")}
                          </Text>
                        </View>
                      )}
                    </View>
                    {isDone ? (
                      <Text style={s.mDoneBadge}>✓</Text>
                    ) : (
                      <Text style={s.mStar}>
                        {Array(m.stars).fill("⭐").join("")}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
        );
      })}

      <T style={s.hint} speak={speak}>
        {tGender("missionPick.hint", undefined, rtlChildSex)}
      </T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>{t("common.back")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── ActiveScreen ──────────────────────────────────────────────────────────────

export function ActiveScreen({
  mission,
  onDone,
  onSkip,
  speak,
  rtlChildSex = "male",
}: {
  mission: any;
  onDone: () => void;
  onSkip: () => void;
  speak: (t: string) => void;
  rtlChildSex?: RtlChildSex;
}) {
  if (!mission) return null;
  return (
    <View style={s.screen}>
      <View style={{ height: BUDDY_FIXED_SPACER }} />
      <TouchableOpacity
        onPress={() => speak(tSpeak("buddy.start", undefined, rtlChildSex))}
        activeOpacity={0.65}
      >
        <Text style={s.msg}>
          {tGender("buddy.start", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={s.activeCard}
        onPress={() =>
          speak(
            `${getMissionTitle(mission.id, mission.title)}. ${getMissionSubtitle(mission.id, mission.subtitle)}`,
          )
        }
        activeOpacity={0.85}
      >
        <Text style={s.activeEmoji}>{mission.emoji}</Text>
        <Text style={s.activeTitle}>
          {getMissionTitle(mission.id, mission.title)}
        </Text>
        <Text style={s.activeSub}>
          {getMissionSubtitle(mission.id, mission.subtitle)}
        </Text>
        <View style={s.starsRow}>
          {Array(mission.stars)
            .fill("⭐")
            .map((_: any, i: number) => (
              <Text key={i} style={s.starBig}>
                ⭐
              </Text>
            ))}
        </View>
        <Text style={s.tapHint}>
          {tGender("active.tap_hint", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnPrimary} onPress={onDone}>
        <Text style={s.btnPrimaryTxt}>
          {tGender("active.btn_done", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>
          {tGender("active.btn_skip", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── CelebrateScreen ───────────────────────────────────────────────────────────

export function CelebrateScreen({
  mission,
  stars,
  totalEver,
  totalMissions,
  completedToday,
  isVeryExcited,
  onContinue,
  onRewards,
  speak,
  onBack,
  rtlChildSex = "male",
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
  onBack: () => void;
  rtlChildSex?: RtlChildSex;
}) {
  if (!mission) return null;
  const emotionalMsg = isVeryExcited
    ? getMilestoneMessage(totalEver)
    : getProgressionMessage(totalMissions, completedToday);

  return (
    <View style={s.screen}>
      <View style={{ height: BUDDY_FIXED_SPACER }} />
      <T style={isVeryExcited ? s.milestoneTitle : s.celebTitle} speak={speak}>
        {isVeryExcited ? t("celebrate.milestone_title") : t("celebrate.title")}
      </T>
      <T style={s.progressionMsg} speak={speak}>
        {emotionalMsg}
      </T>
      <TouchableOpacity
        style={s.earnedCard}
        onPress={() => speak(tSpeak("buddy.done", undefined, rtlChildSex))}
        activeOpacity={0.85}
      >
        <Text style={s.earnedEmoji}>{mission.emoji}</Text>
        <Text style={s.earnedName}>
          {getMissionTitle(mission.id, mission.title)}
        </Text>
        <Text style={s.earnedStars}>
          {Array(mission.stars).fill("⭐").join(" ")}
        </Text>
        <Text style={s.earnedTotal}>
          {t("celebrate.earned_total", { stars: stars })}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnPrimary} onPress={onContinue}>
        <Text style={s.btnPrimaryTxt}>
          {tGender("celebrate.btn_next", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSecondary} onPress={onRewards}>
        <Text style={s.btnSecondaryTxt}>
          {tGender("celebrate.btn_rewards", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>{t("common.back")}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── RewardsScreen ─────────────────────────────────────────────────────────────

function RewardCard({
  reward,
  stars,
  speak,
  onRedeem,
  showExactStarCost,
  rtlChildSex = "male",
}: {
  reward: (typeof REWARDS)[number];
  stars: number;
  speak: (t: string) => void;
  onRedeem: (r: any) => void;
  showExactStarCost: boolean;
  rtlChildSex?: RtlChildSex;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const animatingRef = React.useRef(false);
  const can = stars >= reward.cost;
  const title = getRewardTitle(reward.id, reward.title);
  const needText = showExactStarCost
    ? t("rewards.need_exact", { count: Math.max(0, reward.cost - stars) })
    : t("rewards.need_vague");
  const statusText = can
    ? tSpeak("rewards.ready", undefined, rtlChildSex)
    : needText;

  function handleRedeem() {
    if (animatingRef.current) return;
    animatingRef.current = true;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.04,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      animatingRef.current = false;
      onRedeem(reward);
    });
  }

  return (
    <Animated.View style={[s.rAnimWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[s.rCard, !can && s.rLocked]}
        onPress={() => speak(`${title}. ${statusText}`)}
        activeOpacity={0.7}
      >
        <Text style={s.rEmoji}>{reward.emoji}</Text>
        <View style={s.rInfo}>
          <Text style={s.rTitle}>{title}</Text>
          <Text style={s.rCost}>{Array(reward.cost).fill("⭐").join("")}</Text>
        </View>
        {can ? (
          <TouchableOpacity
            style={s.rReadyBtn}
            onPress={(e) => {
              e.stopPropagation();
              handleRedeem();
            }}
            activeOpacity={0.75}
          >
            <Text style={s.rReadyBtnTxt}>
              {tGender("rewards.ready", undefined, rtlChildSex)}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.rNeed}>{needText}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function RewardsScreen({
  stars,
  totalEver,
  onBack,
  speak,
  onRedeem,
  showExactStarCost,
  rewards,
  rtlChildSex = "male",
}: {
  stars: number;
  totalEver: number;
  onBack: () => void;
  speak: (t: string) => void;
  onRedeem: (r: any) => void;
  showExactStarCost: boolean;
  rewards?: typeof REWARDS;
  rtlChildSex?: RtlChildSex;
}) {
  const list = rewards ?? REWARDS;
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={{ height: BUDDY_FIXED_SPACER }} />
      <T style={s.pageTitle} speak={speak}>
        {t("rewards.title")}
      </T>
      {list.map((r) => (
        <RewardCard
          key={r.id}
          reward={r}
          stars={stars}
          speak={speak}
          onRedeem={onRedeem}
          showExactStarCost={showExactStarCost}
          rtlChildSex={rtlChildSex}
        />
      ))}
      <T style={s.hint} speak={speak}>
        {t("rewards.hint")}
      </T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>{t("common.back")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: C.bg,
  },
  scroll: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 52,
    backgroundColor: C.bg,
  },

  msg: {
    fontSize: 17,
    color: C.text,
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  tapHint: { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: "italic" },

  pageTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: C.text,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  hint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Slot grouping
  slotSection: { width: "100%", marginBottom: 8 },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  slotLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  slotMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotCount: { fontSize: 12, color: C.muted },
  slotChevron: { fontSize: 10, color: C.muted },

  // Mission cards
  mCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 13,
    marginBottom: 7,
    width: "100%",
  },
  mCardBig: { backgroundColor: "#FFF9EC", borderColor: "#E8D7A9" },
  mCardDone: {
    backgroundColor: "#F1FAF6",
    borderColor: "#CFE9DD",
    opacity: 0.75,
  },
  mCardPermanent: { backgroundColor: "#F1FAF6", borderColor: "#CDE7DA" },
  mCardRotating: { backgroundColor: "#FFF8E7", borderColor: "#F1D58E" },
  mEmoji: { fontSize: 30, marginRight: 11 },
  mEmojiDone: { opacity: 0.55 },
  mInfo: { flex: 1 },
  mTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  mSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  mStar: { fontSize: 17 },
  mTxtDone: { textDecorationLine: "line-through", color: C.muted },
  mDoneBadge: {
    fontSize: 20,
    color: C.green,
    fontWeight: "800",
    marginLeft: 4,
  },

  // Type pills (mission cards)
  typePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  typePillPermanent: { backgroundColor: C.green },
  typePillRotating: { backgroundColor: C.goldBdr },
  typePillTxtPermanent: {
    fontSize: 10,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.3,
  },
  typePillTxtRotating: {
    fontSize: 10,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.3,
  },

  // Encore / bonus
  encoreCard: {
    width: "100%",
    backgroundColor: "#F4FAF7",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    padding: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  encoreEmoji: { fontSize: 40, marginBottom: 6 },
  encoreTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.green,
    textAlign: "center",
  },
  encoreSub: {
    fontSize: 13,
    color: C.green,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  encoreBonusLabel: {
    fontSize: 13,
    color: C.green,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  bonusCard: { backgroundColor: "#FFF9EC", borderColor: "#E8D7A9" },

  celebTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.green,
    marginBottom: 4,
    textAlign: "center",
  },
  milestoneTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: C.green,
    marginBottom: 4,
    textAlign: "center",
  },
  progressionMsg: {
    fontSize: 15,
    color: C.green,
    textAlign: "center",
    marginVertical: 6,
    fontWeight: "500",
    lineHeight: 22,
  },

  earnedCard: {
    backgroundColor: "#F4FAF7",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    padding: 22,
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  earnedEmoji: { fontSize: 44, marginBottom: 6 },
  earnedName: { fontSize: 16, fontWeight: "600", color: C.green },
  earnedStars: { fontSize: 26, marginTop: 6 },
  earnedTotal: {
    fontSize: 14,
    color: C.green,
    marginTop: 4,
    fontWeight: "500",
  },

  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 32,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  btnPrimaryTxt: { fontSize: 19, color: "#fff", fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "#FFF9EC",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#E8D7A9",
    paddingVertical: 15,
    paddingHorizontal: 32,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  btnSecondaryTxt: { fontSize: 17, color: "#92400E", fontWeight: "600" },
  btnSkip: { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack: { marginTop: 18, padding: 12 },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: "500" },

  activeCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 26,
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  activeEmoji: { fontSize: 58, marginBottom: 10 },
  activeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  activeSub: {
    fontSize: 14,
    color: C.muted,
    marginTop: 5,
    textAlign: "center",
  },
  starsRow: { flexDirection: "row", marginTop: 12, gap: 4 },
  starBig: { fontSize: 24 },

  rAnimWrap: {
    width: "100%",
    marginBottom: 7,
  },
  rCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 13,
    width: "100%",
  },
  rLocked: { opacity: 0.42 },
  rEmoji: { fontSize: 29, marginRight: 11 },
  rInfo: { flex: 1 },
  rTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  rCost: { fontSize: 12, color: C.muted, marginTop: 2 },
  rReadyBtn: {
    backgroundColor: C.greenLt,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  rReadyBtnTxt: { fontSize: 13, color: C.green, fontWeight: "700" },
  rNeed: { fontSize: 11, color: C.muted, textAlign: "right" },
});

// Expo Router: suppress "missing default export" warning for non-route files
export default function _MissionScreens() {
  return null;
}
