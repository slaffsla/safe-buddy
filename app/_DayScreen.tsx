// _DayScreen.tsx — full day timeline
// Vertical list of all schedule blocks. Past fades, current is prominent,
// upcoming is normal. Never shows a "missed" state.

import { useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLayoutMetrics } from "../lib/layoutMetrics";
import {
  C,
  ScheduleBlock,
  getBlockStatus,
  getScheduleTitle,
} from "./_constants";
import { SpeakFn } from "./_speechTypes";
import { getAppLocale, t } from "./i18n";

interface DayScreenProps {
  blocks: ScheduleBlock[];
  isWeekendDay: boolean;
  speak: SpeakFn;
  buddyDjModeEnabled?: boolean;
  onClose: () => void;
  onStartMission: (missionId: number) => void;
}

function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function englishHour(hour: number): string {
  const h = hour % 12 || 12;
  const words = [
    "twelve",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
  ];
  return words[h % 12];
}

function russianHour(hour: number): string {
  const h = hour % 24;
  const words: Record<number, string> = {
    0: "двенадцать",
    1: "час",
    2: "два",
    3: "три",
    4: "четыре",
    5: "пять",
    6: "шесть",
    7: "семь",
    8: "восемь",
    9: "девять",
    10: "десять",
    11: "одиннадцать",
    12: "двенадцать",
    13: "час",
    14: "два",
    15: "три",
    16: "четыре",
    17: "пять",
    18: "шесть",
    19: "семь",
    20: "восемь",
    21: "девять",
    22: "десять",
    23: "одиннадцать",
  };
  return words[h] ?? String(h);
}

function formatTimeForSpeech(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const locale = getAppLocale();

  if (locale === "en") {
    const hourText = englishHour(hour);
    if (minute === 0) return `${hourText} o'clock`;
    if (minute < 10) return `${hourText} oh ${minute}`;
    return `${hourText} ${minute}`;
  }

  if (locale === "ru") {
    const hourText = russianHour(hour);
    if (minute === 0) {
      return hour % 12 === 1 ? `${hourText}` : `${hourText} часов`;
    }
    return `${hourText} ${minute}`;
  }

  // For non-English / non-Russian locales, keep a neutral numeric wording
  // instead of forcing Russian hour forms.
  if (minute === 0) return `${hour}`;
  return `${hour} ${minute}`;
}

export default function DayScreen({
  blocks,
  isWeekendDay,
  speak,
  buddyDjModeEnabled = false,
  onClose,
  onStartMission,
}: DayScreenProps) {
  const { contentMaxWidth, screenPadding, isLargeTablet, buddyContentSpacer } =
    useLayoutMetrics();
  const scrollRef = useRef<ScrollView | null>(null);
  const blockYRef = useRef<Record<number, number>>({});

  const visibleBlocks = blocks
    .filter((b) => (isWeekendDay ? b.weekends : b.weekdays))
    .slice()
    .sort(
      (a, b) =>
        parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
    );

  const currentBlock = visibleBlocks.find(
    (b) => getBlockStatus(b) === "current",
  );
  const nextUpcomingBlock = visibleBlocks.find(
    (b) => getBlockStatus(b) === "upcoming",
  );
  const focusBlock = currentBlock ?? nextUpcomingBlock;
  const didScrollToFocus = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (didScrollToFocus.current) return;
      if (focusBlock) {
        const targetY = blockYRef.current[focusBlock.id];
        if (targetY != null) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, targetY - 40),
            animated: true,
          });
          didScrollToFocus.current = true;
        }
      } else {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        didScrollToFocus.current = true;
      }
    }, 150);
    return () => clearTimeout(t);
  }, [focusBlock]);

  return (
    <View style={s.root}>
      <View
        style={[
          s.header,
          isLargeTablet && s.headerLarge,
          { maxWidth: contentMaxWidth + screenPadding * 2 },
        ]}
      >
        <Text style={[s.headerTitle, isLargeTablet && s.headerTitleLarge]}>
          {t("day.title")}
        </Text>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onClose}
          accessibilityLabel={t("day.close_a11y")}
        >
          <Text style={s.closeBtnTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scrollView}
        contentContainerStyle={[
          s.scroll,
          isLargeTablet && s.scrollLarge,
          {
            flexGrow: 1,
            maxWidth: contentMaxWidth,
            padding: screenPadding,
            paddingTop: buddyContentSpacer,
            paddingBottom: isLargeTablet ? 70 : 50,
          },
        ]}
        onContentSizeChange={() => {
          if (didScrollToFocus.current) return;
          if (focusBlock) {
            const targetY = blockYRef.current[focusBlock.id];
            if (targetY != null) {
              scrollRef.current?.scrollTo({
                y: Math.max(0, targetY - 40),
                animated: true,
              });
              didScrollToFocus.current = true;
            }
          } else {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            didScrollToFocus.current = true;
          }
        }}
      >
        {visibleBlocks.length === 0 ? (
          <Text style={s.empty}>{t("day.empty")}</Text>
        ) : (
          visibleBlocks.map((block, idx) => {
            const status = getBlockStatus(block);
            const isCurrent = status === "current";
            const isPast = status === "past";
            const cardStyle = [
              s.card,
              { backgroundColor: block.color ?? C.white },
              isCurrent && s.cardCurrent,
              isPast && s.cardPast,
            ];

            return (
              <View
                key={block.id}
                style={s.row}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  blockYRef.current[block.id] = y;
                  if (
                    !didScrollToFocus.current &&
                    focusBlock?.id === block.id
                  ) {
                    scrollRef.current?.scrollTo({
                      y: Math.max(0, y - 40),
                      animated: true,
                    });
                    didScrollToFocus.current = true;
                  }
                }}
              >
                {/* Timeline spine */}
                <View style={s.spineCol}>
                  <View
                    style={[
                      s.dot,
                      isCurrent && s.dotCurrent,
                      isPast && s.dotPast,
                    ]}
                  />
                  {idx < visibleBlocks.length - 1 && (
                    <View style={[s.spine, isPast && s.spinePast]} />
                  )}
                </View>

                {/* Block card */}
                <TouchableOpacity
                  style={cardStyle}
                  onPress={() =>
                    speak(
                      `${getScheduleTitle(block.id, block.title)}, ${formatTimeForSpeech(block.startTime)}`,
                      {
                        intent: "ambientPlay",
                        delivery: buddyDjModeEnabled ? "djCut" : "replace",
                      },
                    )
                  }
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      s.cardEmoji,
                      isCurrent && s.cardEmojiCurrent,
                      isPast && s.cardEmojiPast,
                    ]}
                  >
                    {block.emoji}
                  </Text>
                  <View style={s.cardInfo}>
                    <Text
                      style={[
                        s.cardTitle,
                        isCurrent && s.cardTitleCurrent,
                        isPast && s.cardTitlePast,
                      ]}
                    >
                      {getScheduleTitle(block.id, block.title)}
                    </Text>
                    <Text style={[s.cardTime, isPast && s.cardTimePast]}>
                      {block.startTime} — {block.endTime}
                    </Text>
                  </View>
                  {isCurrent && typeof block.missionId === "number" && (
                    <TouchableOpacity
                      style={s.startBtn}
                      onPress={() => onStartMission(block.missionId!)}
                      accessibilityLabel={t("day.start_mission_a11y", {
                        title: getScheduleTitle(block.id, block.title),
                      })}
                    >
                      <Text style={s.startBtnTxt}>▶</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={s.footer} pointerEvents="box-none">
        <TouchableOpacity
          style={s.btnBack}
          onPress={onClose}
          accessibilityLabel={t("day.back_a11y")}
        >
          <Text style={s.btnBackTxt}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerLarge: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: C.text },
  headerTitleLarge: { fontSize: 30 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFDF9",
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnTxt: { fontSize: 18, color: C.text },

  scroll: {
    width: "100%",
    alignSelf: "center",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollLarge: {
    paddingBottom: 110,
  },
  empty: { textAlign: "center", color: C.muted, marginTop: 40, fontSize: 15 },

  row: { flexDirection: "row", alignItems: "stretch" },

  spineCol: { width: 28, alignItems: "center" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.green,
    marginTop: 18,
  },
  dotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: C.green,
    borderWidth: 3,
    borderColor: C.greenLt,
  },
  dotPast: { backgroundColor: C.muted, opacity: 0.4 },
  spine: {
    flex: 1,
    width: 2,
    backgroundColor: C.green,
    opacity: 0.35,
    marginTop: 4,
  },
  spinePast: { backgroundColor: C.muted, opacity: 0.2 },

  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardCurrent: {
    borderColor: "#CFE9DD",
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardPast: { opacity: 0.55 },

  cardEmoji: { fontSize: 26 },
  cardEmojiCurrent: { fontSize: 32 },
  cardEmojiPast: { opacity: 0.6 },

  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  cardTitleCurrent: { fontSize: 17, fontWeight: "700", color: C.text },
  cardTitlePast: { color: C.muted, fontWeight: "500" },
  cardTime: { fontSize: 12, color: C.muted, marginTop: 2 },
  cardTimePast: { color: C.muted, opacity: 0.7 },

  startBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnTxt: { fontSize: 18, color: C.white, fontWeight: "700" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: "center",
    zIndex: 10,
    pointerEvents: "box-none",
  },
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
});
