// _DayScreen.tsx — full day timeline
// Vertical list of all schedule blocks. Past fades, current is prominent,
// upcoming is normal. Never shows a "missed" state.

import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  C,
  ScheduleBlock,
  getBlockStatus,
  getScheduleTitle,
} from "./_constants";
import { t } from "./i18n";

interface DayScreenProps {
  blocks: ScheduleBlock[];
  isWeekendDay: boolean;
  speak: (t: string) => void;
  onClose: () => void;
  onStartMission: (missionId: number) => void;
}

export default function DayScreen({
  blocks,
  isWeekendDay,
  speak,
  onClose,
  onStartMission,
}: DayScreenProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const blockYRef = useRef<Record<number, number>>({});

  const visibleBlocks = blocks
    .filter((b) => (isWeekendDay ? b.weekends : b.weekdays))
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Scroll to current block on mount (if any).
  useEffect(() => {
    const t = setTimeout(() => {
      const current = visibleBlocks.find(
        (b) => getBlockStatus(b) === "current",
      );
      if (current && blockYRef.current[current.id] != null) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, blockYRef.current[current.id] - 40),
          animated: true,
        });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [visibleBlocks]);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t("day.title")}</Text>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onClose}
          accessibilityLabel={t("day.close_a11y")}
        >
          <Text style={s.closeBtnTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll}>
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
                  blockYRef.current[block.id] = e.nativeEvent.layout.y;
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
                      `${getScheduleTitle(block.id, block.title)}. ${block.startTime}`,
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
        <TouchableOpacity
          style={s.btnBack}
          onPress={onClose}
          accessibilityLabel={t("day.back_a11y")}
        >
          <Text style={s.btnBackTxt}>{t("common.back")}</Text>
        </TouchableOpacity>
        <View style={{ height: 60 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 22, fontWeight: "700", color: C.text },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnTxt: { fontSize: 18, color: C.text },

  scroll: { padding: 20, paddingTop: 6 },
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
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardCurrent: {
    borderColor: C.green,
    borderWidth: 2,
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

  btnBack: { marginTop: 18, padding: 12, alignSelf: "center" },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: "500" },
});
