// _MissionScreens.tsx — SafeBuddy mission and reward screens
// MissionPickScreen: slot-grouped, current slot first.
// ActiveScreen, CelebrateScreen, RewardsScreen: unchanged logic.

import React from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CONTENT_MAX_WIDTH, useLayoutMetrics } from "../lib/layoutMetrics";
import { visualAssets } from "../lib/visualAssets";
import { T } from "./_SharedUI";
import {
  AgeProfile,
  C,
  currentSlot,
  getMilestoneMessage,
  getMissionSubtitle,
  getMissionTitle,
  getProgressionMessage,
  getRewardTitle,
  MISSION_POOL,
  MissionSlot,
  pickSeededItem,
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
const REWARD_COLORS = [
  { bg: "#FFF8E7", border: "#F1D58E", well: "#FFE7B8" },
  { bg: "#F4FAF7", border: "#CFE9DD", well: "#DFF5EC" },
  { bg: "#EEF2FF", border: "#D6DDFC", well: "#E1E7FF" },
  { bg: "#FFF1E9", border: "#F5C7B5", well: "#FFD9CB" },
];

function missionRowTint(slot: MissionSlot) {
  const colors = SLOT_COLORS[slot] ?? SLOT_COLORS.any;
  return { backgroundColor: colors.bg, borderColor: colors.border };
}

function MissionIcon({
  item,
  wellStyle,
  emojiStyle,
  imageStyle,
}: {
  item: { emoji: string; imageUri?: string };
  wellStyle: any;
  emojiStyle: any;
  imageStyle: any;
}) {
  return (
    <View style={wellStyle}>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={imageStyle} resizeMode="cover" />
      ) : (
        <Text style={emojiStyle}>{item.emoji}</Text>
      )}
    </View>
  );
}

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
  beforeRewardMode?: boolean;
  rtlChildSex?: RtlChildSex;
  ageProfile?: AgeProfile;
}

export function MissionPickScreen({
  onPick,
  onBack,
  speak,
  firstTime,
  missions,
  doneIds,
  bonusMission,
  beforeRewardMode = false,
  rtlChildSex = "male",
  ageProfile,
}: MissionPickProps) {
  const { buddyContentSpacer, contentMaxWidth, screenPadding, isLargeTablet } =
    useLayoutMetrics();
  const pool =
    !missions || missions.length === 0
      ? beforeRewardMode
        ? []
        : MISSION_POOL
      : missions;

  const done = new Set<number>(doneIds ?? []);
  const remaining = pool.filter((m) => !done.has(m.id)).length;
  const allDone = pool.length > 0 && remaining === 0;
  const showBonus = allDone && !!bonusMission && !done.has(bonusMission.id);
  const showBeforeRewardEmpty =
    beforeRewardMode && (pool.length === 0 || (allDone && !showBonus));

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

  if (firstTime && pool.length > 0) {
    return (
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          s.firstMissionScroll,
          isLargeTablet && s.scrollLarge,
          {
            maxWidth: contentMaxWidth,
            padding: screenPadding,
            paddingTop: buddyContentSpacer,
          },
        ]}
      >
        <View
          style={[s.firstMissionHero, isLargeTablet && s.firstMissionHeroLarge]}
        >
          <Image
            source={visualAssets.graphics.missionRocket}
            style={[
              s.firstMissionHeroGraphic,
              isLargeTablet && s.firstMissionHeroGraphicLarge,
            ]}
            resizeMode="contain"
          />
          <T style={[s.pageTitle, s.firstMissionTitle]} speak={speak}>
            {tGender("missionPick.first_title", undefined, rtlChildSex)}
          </T>
          <T
            style={[s.firstMissionSub, isLargeTablet && s.firstMissionSubLarge]}
            speak={speak}
          >
            {tGender("missionPick.first_sub", undefined, rtlChildSex)}
          </T>
        </View>

        <View style={s.firstMissionList}>
          {pool.slice(0, 3).map((m, index) => (
            <TouchableOpacity
              key={`first-mission-${m.id}`}
              style={[
                s.mCard,
                missionRowTint(m.slot),
                s.firstMissionCard,
                index === 0 && s.firstMissionCardPrimary,
                isLargeTablet && s.firstMissionCardLarge,
              ]}
              onPress={() => onPick(m)}
              onLongPress={() =>
                speak(
                  `${getMissionTitle(m.id, m.title, ageProfile)}. ${getMissionSubtitle(m.id, m.subtitle, ageProfile)}`,
                )
              }
              activeOpacity={0.75}
            >
              <MissionIcon
                item={m}
                wellStyle={[
                  s.mEmojiWell,
                  s.firstMissionEmojiWell,
                  isLargeTablet && s.firstMissionEmojiWellLarge,
                ]}
                emojiStyle={[
                  s.mEmoji,
                  s.firstMissionEmoji,
                  isLargeTablet && s.firstMissionEmojiLarge,
                ]}
                imageStyle={[
                  s.missionThumb,
                  s.firstMissionThumb,
                  isLargeTablet && s.firstMissionThumbLarge,
                ]}
              />
              <View style={s.mInfo}>
                <Text
                  style={[
                    s.mTitle,
                    s.firstMissionCardTitle,
                    isLargeTablet && s.firstMissionCardTitleLarge,
                  ]}
                >
                  {getMissionTitle(m.id, m.title, ageProfile)}
                </Text>
                <Text
                  style={[
                    s.mSub,
                    s.firstMissionCardSub,
                    isLargeTablet && s.firstMissionCardSubLarge,
                  ]}
                >
                  {getMissionSubtitle(m.id, m.subtitle, ageProfile)}
                </Text>
              </View>
              <View
                style={[
                  s.mStarBadge,
                  s.firstMissionStar,
                  isLargeTablet && s.firstMissionStarLarge,
                ]}
              >
                <Text style={s.mStar}>{Array(m.stars).fill("⭐").join("")}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <T style={s.hint} speak={speak}>
          {tGender("missionPick.first_hint", undefined, rtlChildSex)}
        </T>
      </ScrollView>
    );
  }

  return (
    <View style={s.screenRoot}>
      <ScrollView
        style={s.screenScroll}
        contentContainerStyle={[
          s.scroll,
          isLargeTablet && s.scrollLarge,
          {
            maxWidth: contentMaxWidth,
            padding: screenPadding,
            paddingTop: buddyContentSpacer,
            paddingBottom: isLargeTablet ? 128 : 96,
          },
        ]}
      >
        <T
          style={[s.pageTitle, isLargeTablet && s.pageTitleLarge]}
          speak={speak}
        >
          {tGender(
            beforeRewardMode
              ? "missionPick.before_reward_title"
              : "missionPick.title",
            undefined,
            rtlChildSex,
          )}
        </T>
        {beforeRewardMode && (
          <T
            style={[s.firstMissionSub, isLargeTablet && s.firstMissionSubLarge]}
            speak={speak}
          >
            {tGender("missionPick.before_reward_sub", undefined, rtlChildSex)}
          </T>
        )}

        {allDone && !showBeforeRewardEmpty && (
          <View style={s.encoreCard}>
            <Image
              source={visualAssets.graphics.completeBadge}
              style={s.encoreGraphic}
              resizeMode="contain"
            />
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
                  style={[
                    s.mCard,
                    missionRowTint(bonusMission.slot),
                    s.bonusCard,
                  ]}
                  onPress={() => onPick(bonusMission)}
                  onLongPress={() =>
                    speak(
                      `${getMissionTitle(bonusMission.id, bonusMission.title, ageProfile)}. ${getMissionSubtitle(bonusMission.id, bonusMission.subtitle, ageProfile)}`,
                    )
                  }
                >
                  <MissionIcon
                    item={bonusMission}
                    wellStyle={s.mEmojiWell}
                    emojiStyle={s.mEmoji}
                    imageStyle={s.missionThumb}
                  />
                  <View style={s.mInfo}>
                    <Text style={s.mTitle}>
                      {getMissionTitle(bonusMission.id, bonusMission.title, ageProfile)}
                    </Text>
                    <Text style={s.mSub}>
                      {getMissionSubtitle(
                        bonusMission.id,
                        bonusMission.subtitle,
                        ageProfile,
                      )}
                    </Text>
                  </View>
                  <View style={s.mStarBadge}>
                    <Text style={s.mStar}>
                      {Array(bonusMission.stars).fill("⭐").join("")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {showBeforeRewardEmpty && (
          <View style={s.encoreCard}>
            <Image
              source={visualAssets.graphics.completeBadge}
              style={s.encoreGraphic}
              resizeMode="contain"
            />
            <T style={s.encoreTitle} speak={speak}>
              {tGender(
                "missionPick.before_reward_empty_title",
                undefined,
                rtlChildSex,
              )}
            </T>
            <T style={s.encoreSub} speak={speak}>
              {tGender(
                "missionPick.before_reward_empty_sub",
                undefined,
                rtlChildSex,
              )}
            </T>
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
                  <View style={s.slotCountPill}>
                    <Text style={s.slotCount}>
                      {slotDone}/{items.length}
                    </Text>
                  </View>
                  <Text style={s.slotChevron}>{isOpen ? "▲" : "▼"}</Text>
                </View>
              </TouchableOpacity>

              {isOpen &&
                items.map((m) => {
                  const isDone = done.has(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        s.mCard,
                        missionRowTint(m.slot),
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
                                title: getMissionTitle(m.id, m.title, ageProfile),
                              },
                              rtlChildSex,
                            ),
                          );
                      }}
                      onLongPress={() =>
                        speak(
                          `${getMissionTitle(m.id, m.title, ageProfile)}. ${getMissionSubtitle(m.id, m.subtitle, ageProfile)}`,
                        )
                      }
                      activeOpacity={isDone ? 1 : 0.7}
                    >
                      <MissionIcon
                        item={m}
                        wellStyle={[s.mEmojiWell, isDone && s.mEmojiWellDone]}
                        emojiStyle={s.mEmoji}
                        imageStyle={s.missionThumb}
                      />
                      <View style={s.mInfo}>
                        <Text style={[s.mTitle, isDone && s.mTitleDone]}>
                          {getMissionTitle(m.id, m.title, ageProfile)}
                        </Text>
                        <Text style={[s.mSub, isDone && s.mSubDone]}>
                          {getMissionSubtitle(m.id, m.subtitle, ageProfile)}
                        </Text>
                      </View>
                      {isDone ? (
                        <Text style={s.mDoneBadge}>✓</Text>
                      ) : (
                        <View style={s.mStarBadge}>
                          <Text style={s.mStar}>
                            {Array(m.stars).fill("⭐").join("")}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          );
        })}

        <T style={s.hint} speak={speak}>
          {tGender(
            showBeforeRewardEmpty
              ? "missionPick.before_reward_empty_hint"
              : beforeRewardMode
              ? "missionPick.before_reward_hint"
              : "missionPick.hint",
            undefined,
            rtlChildSex,
          )}
        </T>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.btnBack} onPress={onBack}>
          <Text style={s.btnBackTxt}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── ActiveScreen ──────────────────────────────────────────────────────────────

export function ActiveScreen({
  mission,
  onDone,
  onSkip,
  speak,
  rtlChildSex = "male",
  ageProfile,
}: {
  mission: any;
  onDone: () => void;
  onSkip: () => void;
  speak: (t: string) => void;
  rtlChildSex?: RtlChildSex;
  ageProfile?: AgeProfile;
}) {
  const { buddyContentSpacer, contentMaxWidth, screenPadding, isLargeTablet } =
    useLayoutMetrics();
  if (!mission) return null;
  const doneLabel = tGender("active.btn_done", undefined, rtlChildSex).replace(
    /^[^\p{L}\p{N}]+/u,
    "",
  );
  return (
    <ScrollView
      contentContainerStyle={[
        s.screen,
        s.activeScreenScroll,
        isLargeTablet && s.activeScreenScrollLarge,
        {
          maxWidth: contentMaxWidth,
          padding: screenPadding,
          paddingTop: buddyContentSpacer,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => speak(tSpeak("buddy.start", undefined, rtlChildSex))}
        activeOpacity={0.65}
      >
        <Text style={[s.msg, isLargeTablet && s.msgLarge]}>
          {tGender("buddy.start", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          s.activeCard,
          missionRowTint(mission.slot ?? "any"),
          isLargeTablet && s.activeCardLarge,
        ]}
        onPress={() =>
          speak(
            `${getMissionTitle(mission.id, mission.title, ageProfile)}. ${getMissionSubtitle(mission.id, mission.subtitle, ageProfile)}`,
          )
        }
        activeOpacity={0.85}
      >
        <MissionIcon
          item={mission}
          wellStyle={[
            s.activeEmojiWell,
            isLargeTablet && s.activeEmojiWellLarge,
          ]}
          emojiStyle={[s.activeEmoji, isLargeTablet && s.activeEmojiLarge]}
          imageStyle={[
            s.activeThumb,
            isLargeTablet && s.activeThumbLarge,
          ]}
        />
        <Text style={[s.activeTitle, isLargeTablet && s.activeTitleLarge]}>
          {getMissionTitle(mission.id, mission.title, ageProfile)}
        </Text>
        <Text style={[s.activeSub, isLargeTablet && s.activeSubLarge]}>
          {getMissionSubtitle(mission.id, mission.subtitle, ageProfile)}
        </Text>
        <View style={[s.mStarBadge, s.activeStarBadge]}>
          {Array(mission.stars)
            .fill("⭐")
            .map((_: any, i: number) => (
              <Text key={`active-star-${mission.id}-${i}`} style={s.starBig}>
                ⭐
              </Text>
            ))}
        </View>
        <Text style={s.tapHint}>
          {tGender("active.tap_hint", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.btnPrimary, isLargeTablet && s.btnPrimaryLarge]}
        onPress={onDone}
      >
        <View style={[s.btnPrimaryIconWell, isLargeTablet && s.btnPrimaryIconWellLarge]}>
          <Text style={[s.btnPrimaryIcon, isLargeTablet && s.btnPrimaryIconLarge]}>
            ✓
          </Text>
        </View>
        <Text style={[s.btnPrimaryTxt, isLargeTablet && s.btnPrimaryTxtLarge]}>
          {doneLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>
          {tGender("active.btn_skip", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  continueLabelKey,
  rtlChildSex = "male",
  ageProfile,
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
  continueLabelKey?: string;
  rtlChildSex?: RtlChildSex;
  ageProfile?: AgeProfile;
}) {
  const { buddyContentSpacer, contentMaxWidth, screenPadding, isLargeTablet } =
    useLayoutMetrics();
  const nextButtonKey = React.useMemo(() => {
    if (!mission || mission.stars < 2) return "celebrate.btn_next";
    return (
      pickSeededItem(
        ["celebrate.btn_next_challenge", "celebrate.btn_next_adventure"],
        mission.id * 37 + totalEver * 11 + completedToday * 17,
      ) ?? "celebrate.btn_next_challenge"
    );
  }, [completedToday, mission, totalEver]);
  const nextBoostKey = React.useMemo(() => {
    if (!mission || mission.stars < 2 || continueLabelKey) return null;
    if (
      nextButtonKey !== "celebrate.btn_next_challenge" &&
      nextButtonKey !== "celebrate.btn_next_adventure"
    ) {
      return null;
    }
    const seed = mission.id * 19 + totalEver * 7 + completedToday * 13;
    if (seed % 10 >= 3) return null;
    const keys =
      nextButtonKey === "celebrate.btn_next_challenge"
        ? [
            "celebrate.next_boost_challenge_1",
            "celebrate.next_boost_challenge_2",
            "celebrate.next_boost_challenge_3",
          ]
        : [
            "celebrate.next_boost_adventure_1",
            "celebrate.next_boost_adventure_2",
            "celebrate.next_boost_adventure_3",
          ];
    return keys[seed % keys.length];
  }, [completedToday, continueLabelKey, mission, nextButtonKey, totalEver]);
  if (!mission) return null;
  const emotionalMsg = isVeryExcited
    ? getMilestoneMessage(totalEver, rtlChildSex)
    : getProgressionMessage(totalMissions, completedToday, rtlChildSex);

  return (
    <View style={s.screenRoot}>
      <ScrollView
        style={s.screenScroll}
        contentContainerStyle={[
          s.screen,
          s.celebrateScreenScroll,
          {
            maxWidth: contentMaxWidth,
            padding: screenPadding,
            paddingTop: buddyContentSpacer,
            paddingBottom: isLargeTablet ? 128 : 96,
          },
        ]}
      >
        <T
          style={isVeryExcited ? s.milestoneTitle : s.celebTitle}
          speak={speak}
        >
          {isVeryExcited
            ? t("celebrate.milestone_title")
            : t("celebrate.title")}
        </T>
        <T style={s.progressionMsg} speak={speak}>
          {emotionalMsg}
        </T>
        <TouchableOpacity
          style={[s.earnedCard, missionRowTint(mission.slot ?? "any")]}
          onPress={() => speak(tSpeak("buddy.done", undefined, rtlChildSex))}
          activeOpacity={0.85}
        >
          <Image
            source={visualAssets.graphics.completeBadge}
            style={s.earnedGraphic}
            resizeMode="contain"
          />
          <MissionIcon
            item={mission}
            wellStyle={s.earnedEmojiWell}
            emojiStyle={s.earnedEmoji}
            imageStyle={s.earnedThumb}
          />
          <Text style={s.earnedName}>
            {getMissionTitle(mission.id, mission.title, ageProfile)}
          </Text>
          <View style={[s.mStarBadge, s.earnedStarBadge]}>
            <Text style={s.earnedStars}>
              {Array(mission.stars).fill("⭐").join(" ")}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnPrimary, isLargeTablet && s.btnPrimaryLarge]}
          onPress={() => {
            if (nextBoostKey) {
              speak(tSpeak(nextBoostKey, undefined, rtlChildSex));
            }
            onContinue();
          }}
        >
          <View
            style={[
              s.btnPrimaryIconWell,
              isLargeTablet && s.btnPrimaryIconWellLarge,
            ]}
          >
            <Image
              source={visualAssets.graphics.missionRocket}
              style={[
                s.btnPrimaryImageIcon,
                isLargeTablet && s.btnPrimaryImageIconLarge,
              ]}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[s.btnPrimaryTxt, isLargeTablet && s.btnPrimaryTxtLarge]}
          >
            {tGender(continueLabelKey ?? nextButtonKey, undefined, rtlChildSex)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnSecondary, isLargeTablet && s.btnSecondaryLarge]}
          onPress={onRewards}
        >
          <View
            style={[
              s.btnSecondaryIconWell,
              isLargeTablet && s.btnSecondaryIconWellLarge,
            ]}
          >
            <Image
              source={visualAssets.graphics.rewardGift}
              style={[
                s.btnSecondaryImageIcon,
                isLargeTablet && s.btnSecondaryImageIconLarge,
              ]}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[s.btnSecondaryTxt, isLargeTablet && s.btnSecondaryTxtLarge]}
          >
            {tGender("celebrate.btn_rewards", undefined, rtlChildSex)}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.btnBack} onPress={onBack}>
          <Text style={s.btnBackTxt}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── RewardsScreen ─────────────────────────────────────────────────────────────

function RewardCard({
  reward,
  index,
  stars,
  speak,
  onRedeem,
  showExactStarCost,
  large = false,
  rtlChildSex = "male",
}: {
  reward: (typeof REWARDS)[number];
  index: number;
  stars: number;
  speak: (t: string) => void;
  onRedeem: (r: any) => void;
  showExactStarCost: boolean;
  large?: boolean;
  rtlChildSex?: RtlChildSex;
}) {
  const [scale] = React.useState(() => new Animated.Value(1));
  const animatingRef = React.useRef(false);
  const can = stars >= reward.cost;
  const colors = REWARD_COLORS[index % REWARD_COLORS.length];
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
    <Animated.View
      style={[
        s.rAnimWrap,
        large && s.rAnimWrapLarge,
        { transform: [{ scale }] },
      ]}
    >
      <TouchableOpacity
        style={[
          s.rCard,
          { backgroundColor: colors.bg, borderColor: colors.border },
          large && s.rCardLarge,
          !can && s.rLocked,
        ]}
        onPress={() => speak(`${title}. ${statusText}`)}
        activeOpacity={0.7}
      >
        <View
          style={[
            s.rEmojiWell,
            { backgroundColor: colors.well, borderColor: colors.border },
            large && s.rEmojiWellLarge,
          ]}
        >
          <Text style={[s.rEmoji, large && s.rEmojiLarge]}>
            {reward.emoji}
          </Text>
        </View>
        <View style={s.rInfo}>
          <Text style={[s.rTitle, large && s.rTitleLarge]}>{title}</Text>
          <View style={[s.rCostBadge, large && s.rCostBadgeLarge]}>
            <Text style={[s.rCost, large && s.rCostLarge]}>
              {Array(reward.cost).fill("⭐").join("")}
            </Text>
          </View>
        </View>
        {can ? (
          <TouchableOpacity
            style={[s.rReadyBtn, large && s.rReadyBtnLarge]}
            onPress={(e) => {
              e.stopPropagation();
              handleRedeem();
            }}
            activeOpacity={0.75}
          >
            <Text style={[s.rReadyBtnTxt, large && s.rReadyBtnTxtLarge]}>
              {tGender("rewards.ready", undefined, rtlChildSex)}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[s.rNeed, large && s.rNeedLarge]}>{needText}</Text>
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
  const { buddyContentSpacer, contentMaxWidth, screenPadding, isLargeTablet } =
    useLayoutMetrics();
  const list = rewards ?? REWARDS;
  return (
    <View style={s.screenRoot}>
      <ScrollView
        style={s.rewardsScrollView}
        contentContainerStyle={[
          s.scroll,
          s.rewardsScroll,
          isLargeTablet && s.scrollLarge,
          {
            maxWidth: contentMaxWidth,
            padding: screenPadding,
            paddingTop: buddyContentSpacer,
            paddingBottom: isLargeTablet ? 128 : 96,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={visualAssets.graphics.rewardGift}
          style={[
            s.rewardsHeroGraphic,
            isLargeTablet && s.rewardsHeroGraphicLarge,
          ]}
          resizeMode="contain"
        />
        <T
          style={[s.pageTitle, isLargeTablet && s.pageTitleLarge]}
          speak={speak}
        >
          {tGender("rewards.title", undefined, rtlChildSex)}
        </T>
        {list.map((r, index) => (
          <RewardCard
            key={r.id}
            reward={r}
            index={index}
            stars={stars}
            speak={speak}
            onRedeem={onRedeem}
            showExactStarCost={showExactStarCost}
            large={isLargeTablet}
            rtlChildSex={rtlChildSex}
          />
        ))}
        <T style={s.hint} speak={speak}>
          {tGender("rewards.hint", undefined, rtlChildSex)}
        </T>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnBack, isLargeTablet && s.btnBackLarge]}
          onPress={onBack}
        >
          <Text style={[s.btnBackTxt, isLargeTablet && s.btnBackTxtLarge]}>
            {t("common.back")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screenRoot: {
    flex: 1,
    width: "100%",
  },
  screenScroll: { flex: 1, width: "100%" },
  screen: {
    flexGrow: 1,
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scroll: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    alignItems: "center",
    padding: 20,
    paddingBottom: 52,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: "center",
    zIndex: 10,
    pointerEvents: "box-none",
  },
  scrollLarge: {
    paddingBottom: 120,
  },
  rewardsScrollView: {
    flex: 1,
    width: "100%",
  },
  rewardsScroll: {
    flexGrow: 1,
  },
  rewardsHeroGraphic: {
    width: 74,
    height: 74,
    marginBottom: 8,
    marginTop: 2,
  },
  rewardsHeroGraphicLarge: {
    width: 112,
    height: 112,
    marginBottom: 14,
  },
  activeScreenScroll: {
    justifyContent: "flex-start",
    paddingBottom: 34,
  },
  activeScreenScrollLarge: {
    paddingBottom: 120,
  },
  celebrateScreenScroll: {
    justifyContent: "flex-start",
  },
  firstMissionScroll: {
    justifyContent: "flex-start",
  },

  msg: {
    fontSize: 17,
    color: C.text,
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  msgLarge: {
    fontSize: 22,
    lineHeight: 32,
    marginVertical: 14,
  },
  tapHint: { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: "italic" },

  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.text,
    marginBottom: 22,
    alignSelf: "center",
    textAlign: "center",
  },
  pageTitleLarge: {
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 30,
  },
  hint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  firstMissionHero: {
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  firstMissionHeroLarge: {
    marginBottom: 20,
  },
  firstMissionHeroGraphic: {
    width: 82,
    height: 82,
    marginBottom: 8,
  },
  firstMissionHeroGraphicLarge: {
    width: 124,
    height: 124,
    marginBottom: 14,
  },
  firstMissionTitle: {
    marginBottom: 8,
  },
  firstMissionSub: {
    fontSize: 18,
    lineHeight: 26,
    color: C.green,
    textAlign: "center",
    fontWeight: "600",
    maxWidth: 360,
  },
  firstMissionSubLarge: {
    fontSize: 23,
    lineHeight: 32,
    maxWidth: 520,
  },
  firstMissionList: {
    width: "100%",
    gap: 10,
    marginTop: 6,
  },
  firstMissionCard: {
    minHeight: 92,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  firstMissionCardPrimary: {
    backgroundColor: "#F4FAF7",
    borderColor: "#CFE9DD",
  },
  firstMissionCardLarge: {
    minHeight: 118,
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  firstMissionEmojiWell: {
    width: 58,
    height: 58,
    borderRadius: 18,
    marginRight: 14,
  },
  firstMissionEmoji: {
    fontSize: 34,
  },
  firstMissionThumb: {
    borderRadius: 17,
  },
  firstMissionEmojiWellLarge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    marginRight: 20,
  },
  firstMissionEmojiLarge: {
    fontSize: 46,
  },
  firstMissionThumbLarge: {
    borderRadius: 23,
  },
  firstMissionCardTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  firstMissionCardTitleLarge: {
    fontSize: 27,
    lineHeight: 34,
  },
  firstMissionCardSub: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
  firstMissionCardSubLarge: {
    fontSize: 20,
    lineHeight: 28,
    marginTop: 6,
  },
  firstMissionStar: {
    marginLeft: 10,
  },
  firstMissionStarLarge: {
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  // Slot grouping
  slotSection: { width: "100%", marginBottom: 8 },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
  },
  slotLabel: { fontSize: 14, fontWeight: "700", color: C.text },
  slotMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotCountPill: {
    minWidth: 42,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 0.5,
    borderColor: "rgba(29,107,79,0.14)",
    alignItems: "center",
  },
  slotCount: { fontSize: 12, color: C.green, fontWeight: "700" },
  slotChevron: { fontSize: 10, color: C.green, fontWeight: "700" },

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
  mCardBig: { borderColor: "#E8D7A9", borderWidth: 1 },
  mCardDone: {
    backgroundColor: "#F7F7F4",
    borderColor: "#E2DED6",
  },
  mCardPermanent: { borderColor: "#CDE7DA", borderWidth: 1 },
  mCardRotating: { borderColor: "#F1D58E", borderWidth: 1 },
  mEmojiWell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F4FAF7",
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  mEmoji: { fontSize: 26 },
  missionThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 13,
  },
  mEmojiWellDone: {
    backgroundColor: "#F0F0EC",
    borderColor: "#DDD8CF",
    opacity: 0.72,
  },
  mInfo: { flex: 1 },
  mTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  mSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  mStarBadge: {
    backgroundColor: "#FFF8E7",
    borderWidth: 0.5,
    borderColor: "#F1D58E",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginLeft: 8,
    flexShrink: 0,
  },
  mStar: { fontSize: 15 },
  mTitleDone: { color: "#77756F", fontWeight: "600" },
  mSubDone: { color: "#99968F" },
  mDoneBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.green,
    color: C.white,
    textAlign: "center",
    lineHeight: 30,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
    overflow: "hidden",
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
  encoreGraphic: { width: 58, height: 58, marginBottom: 8 },
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
  bonusCard: { borderColor: "#E8D7A9", borderWidth: 1 },

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
  earnedGraphic: { width: 62, height: 62, marginBottom: 2 },
  earnedEmojiWell: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#FFFDF9",
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  earnedEmoji: { fontSize: 38 },
  earnedThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
  },
  earnedName: { fontSize: 16, fontWeight: "600", color: C.green },
  earnedStarBadge: { marginTop: 6, marginLeft: 0, paddingHorizontal: 14 },
  earnedStars: { fontSize: 23 },
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
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  btnPrimaryLarge: {
    borderRadius: 18,
    paddingVertical: 22,
    marginTop: 18,
    gap: 14,
  },
  btnPrimaryIconWell: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryIconWellLarge: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  btnPrimaryIcon: {
    fontSize: 20,
    lineHeight: 24,
    color: C.white,
    fontWeight: "900",
  },
  btnPrimaryIconLarge: {
    fontSize: 25,
    lineHeight: 30,
  },
  btnPrimaryImageIcon: {
    width: 34,
    height: 34,
  },
  btnPrimaryImageIconLarge: {
    width: 44,
    height: 44,
  },
  btnPrimaryTxt: { fontSize: 19, color: "#fff", fontWeight: "700" },
  btnPrimaryTxtLarge: { fontSize: 24 },
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
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  btnSecondaryLarge: {
    borderRadius: 18,
    paddingVertical: 19,
    gap: 14,
  },
  btnSecondaryIconWell: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF1CB",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryIconWellLarge: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  btnSecondaryImageIcon: {
    width: 34,
    height: 34,
  },
  btnSecondaryImageIconLarge: {
    width: 44,
    height: 44,
  },
  btnSecondaryTxt: { fontSize: 17, color: "#92400E", fontWeight: "600" },
  btnSecondaryTxtLarge: { fontSize: 22 },
  btnSkip: { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "center",
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: "500" },
  btnBackLarge: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: "center",
  },
  btnBackTxtLarge: { fontSize: 20 },

  activeCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 24,
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  activeCardLarge: {
    borderRadius: 22,
    paddingVertical: 38,
    paddingHorizontal: 34,
    marginVertical: 22,
  },
  activeEmojiWell: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#F4FAF7",
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  activeEmojiWellLarge: {
    width: 116,
    height: 116,
    borderRadius: 36,
    marginBottom: 20,
  },
  activeEmoji: { fontSize: 54 },
  activeEmojiLarge: { fontSize: 72 },
  activeThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 27,
  },
  activeThumbLarge: {
    borderRadius: 35,
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  activeTitleLarge: { fontSize: 30, lineHeight: 38 },
  activeSub: {
    fontSize: 14,
    color: C.muted,
    marginTop: 5,
    textAlign: "center",
  },
  activeSubLarge: { fontSize: 19, lineHeight: 26, marginTop: 8 },
  activeStarBadge: {
    flexDirection: "row",
    marginTop: 14,
    marginLeft: 0,
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  starBig: { fontSize: 22 },

  rAnimWrap: {
    width: "100%",
    marginBottom: 7,
  },
  rAnimWrapLarge: {
    marginBottom: 12,
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
  rCardLarge: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 82,
  },
  rLocked: { opacity: 0.42 },
  rEmojiWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF8E7",
    borderWidth: 0.5,
    borderColor: "#F1D58E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  rEmojiWellLarge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    marginRight: 18,
  },
  rEmoji: { fontSize: 26 },
  rEmojiLarge: { fontSize: 34 },
  rInfo: { flex: 1 },
  rTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  rTitleLarge: { fontSize: 20, lineHeight: 26 },
  rCostBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    backgroundColor: "#FFF8E7",
    borderWidth: 0.5,
    borderColor: "#F1D58E",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  rCostBadgeLarge: {
    marginTop: 7,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  rCost: { fontSize: 12, color: C.muted },
  rCostLarge: { fontSize: 16 },
  rReadyBtn: {
    backgroundColor: C.green,
    borderRadius: 12,
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  rReadyBtnLarge: {
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginLeft: 16,
  },
  rReadyBtnTxt: { fontSize: 13, color: C.white, fontWeight: "800" },
  rReadyBtnTxtLarge: { fontSize: 17 },
  rNeed: { fontSize: 11, color: C.muted, textAlign: "right" },
  rNeedLarge: { fontSize: 15 },
});

// Expo Router: suppress "missing default export" warning for non-route files
export default function _MissionScreens() {
  return null;
}
