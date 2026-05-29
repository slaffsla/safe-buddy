// _HomeScreen.tsx — SafeBuddy home screen

import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BUDDY_FIXED_SPACER,
  C,
  ScheduleBlock,
  getDailySuggestion,
  getProgressionMessage,
  getScheduleTitle,
} from "./_constants";
import { DailySuggestion, ReflectiveBoost, T } from "./_SharedUI";
import { RtlChildSex, t, tGender, tSpeak } from "./i18n";

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
  onBreathing?: () => void;
  showMorningNudge?: boolean;
  onMorningNudge?: () => void;
  rtlChildSex?: RtlChildSex;
}

export default function HomeScreen({
  totalEver,
  completedToday,
  totalMissions,
  childName,
  lastMission,
  showSuggestion,
  skipSensitivity,
  onStart,
  onRewards,
  onSettings,
  onSuggestionAccept,
  onSuggestionSkip,
  skipCount,
  speak,
  currentBlock,
  nextBlock,
  scheduleEnabled,
  onOpenDay,
  onBreathing,
  showMorningNudge,
  onMorningNudge,
  rtlChildSex = "male",
}: HomeScreenProps) {
  const threshold = Math.max(1, skipSensitivity ?? 2);
  const idleMsg = useMemo(
    () =>
      skipCount >= threshold
        ? t("home.idle_calm")
        : Math.random() > 0.7
          ? t("buddy.idle_alt")
          : t("buddy.idle"),
    [skipCount, threshold],
  );

  const greeting = childName
    ? t("home.greeting_with_name", { name: childName })
    : t("home.greeting");
  const suggestion = getDailySuggestion();
  const progressMsg =
    totalMissions > 0
      ? getProgressionMessage(totalMissions, completedToday)
      : null;

  return (
    <ScrollView contentContainerStyle={s.homeScroll}>
      <T style={s.greeting} speak={speak}>
        {greeting}
      </T>
      <ReflectiveBoost
        lastMission={lastMission}
        speak={speak}
        rtlChildSex={rtlChildSex}
      />
      {progressMsg && (
        <T style={s.progressionMsg} speak={speak}>
          {progressMsg}
        </T>
      )}
      <T style={s.msg} speak={speak}>
        {idleMsg}
      </T>
      {showMorningNudge && (
        <TouchableOpacity
          style={s.morningNudgeCard}
          onPress={onMorningNudge}
          activeOpacity={0.85}
        >
          <Text style={s.morningNudgeIcon}>🌅</Text>
          <View style={s.morningNudgeContent}>
            <Text style={s.morningNudgeTitle}>
              {t("home.morning_nudge_title")}
            </Text>
            <Text style={s.morningNudgeText}>
              {t("home.morning_nudge_sub")}
            </Text>
          </View>
          <Text style={s.morningNudgeCta}>{t("home.morning_nudge_cta")}</Text>
        </TouchableOpacity>
      )}
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
              onPress={() =>
                speak(
                  tSpeak(
                    "home.schedule_now_speak",
                    {
                      title: getScheduleTitle(
                        currentBlock.id,
                        currentBlock.title,
                      ),
                    },
                    rtlChildSex,
                  ),
                )
              }
              activeOpacity={0.8}
            >
              <Text style={s.scheduleEmoji}>{currentBlock.emoji}</Text>
              <View style={s.scheduleInfo}>
                <Text style={s.scheduleNowLabel}>{t("home.schedule_now")}</Text>
                <Text style={s.scheduleTitle}>
                  {getScheduleTitle(currentBlock.id, currentBlock.title)}
                </Text>
              </View>
              <Text style={s.scheduleTime}>
                {t("home.schedule_until", { time: currentBlock.endTime })}
              </Text>
            </TouchableOpacity>
          )}
          {nextBlock && (
            <TouchableOpacity
              style={s.scheduleNext}
              onPress={() =>
                speak(
                  tSpeak(
                    "home.schedule_next_speak",
                    {
                      title: getScheduleTitle(nextBlock.id, nextBlock.title),
                    },
                    rtlChildSex,
                  ),
                )
              }
              activeOpacity={0.8}
            >
              <Text style={s.scheduleNextEmoji}>{nextBlock.emoji}</Text>
              <View style={s.scheduleInfo}>
                <Text style={s.scheduleNextLabel}>
                  {t("home.schedule_next")}
                </Text>
                <Text style={s.scheduleNextTitle}>
                  {getScheduleTitle(nextBlock.id, nextBlock.title)}
                </Text>
              </View>
              <Text style={s.scheduleTime}>{nextBlock.startTime}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity style={s.btnPrimary} onPress={onStart}>
        <Text style={s.btnPrimaryTxt}>
          {tGender("home.btn_pick_mission", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      {scheduleEnabled && onOpenDay && (
        <TouchableOpacity style={s.btnDay} onPress={onOpenDay}>
          <Text style={s.btnDayTxt}>
            {tGender("home.btn_my_day", undefined, rtlChildSex)}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={s.btnSecondary} onPress={onRewards}>
        <Text style={s.btnSecondaryTxt}>
          {tGender("home.btn_rewards", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
      {onBreathing && (
        <TouchableOpacity style={s.btnBreathing} onPress={onBreathing}>
          <Text style={s.btnBreathingTxt}>
            {tGender("home.btn_breathing", undefined, rtlChildSex)}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={s.btnSettings} onPress={onSettings}>
        <Text style={s.btnSettingsTxt}>
          {tGender("home.btn_settings", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  homeScroll: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 52,
    paddingTop: BUDDY_FIXED_SPACER,
    backgroundColor: C.bg,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 4,
  },
  progressionMsg: {
    fontSize: 15,
    color: C.green,
    textAlign: "center",
    marginVertical: 6,
    fontWeight: "500",
    lineHeight: 22,
  },
  msg: {
    fontSize: 17,
    color: C.text,
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  morningNudgeCard: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  morningNudgeIcon: { fontSize: 22 },
  morningNudgeContent: { flex: 1 },
  morningNudgeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  morningNudgeText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 17,
  },
  morningNudgeCta: {
    fontSize: 13,
    color: C.green,
    fontWeight: "700",
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
  btnDay: {
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  btnDayTxt: { fontSize: 16, color: C.green, fontWeight: "600" },
  btnBreathing: {
    backgroundColor: "#F2F7FA",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#C8DAE6",
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  btnBreathingTxt: { fontSize: 16, color: "#1E4E8C", fontWeight: "600" },
  btnSettings: { marginTop: 8, padding: 12, alignItems: "center" },
  btnSettingsTxt: { fontSize: 14, color: C.muted },

  scheduleCard: { width: "100%", marginBottom: 12, gap: 6 },
  scheduleNow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenLt,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    padding: 14,
    gap: 12,
  },
  scheduleNext: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 12,
    gap: 12,
    opacity: 0.85,
  },
  scheduleEmoji: { fontSize: 28 },
  scheduleNextEmoji: { fontSize: 22 },
  scheduleInfo: { flex: 1 },
  scheduleNowLabel: {
    fontSize: 10,
    color: C.green,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scheduleNextLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text,
    marginTop: 1,
  },
  scheduleNextTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: C.muted,
    marginTop: 1,
  },
  scheduleTime: { fontSize: 12, color: C.muted, marginTop: 2 },
});
