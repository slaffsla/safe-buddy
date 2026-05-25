import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOCAL_USAGE_KEY = "sb_local_usage_v1";

export type LocalUsage = {
  missionsStarted: number;
  missionsCompleted: number;
  missionsSkipped: number;
  rewardsViewed: number;
  rewardsRedeemed: number;
  breathingStarted: number;
  breathingCompleted: number;
  breathingSkipped: number;
  morningCompleted: number;
  morningSkipped: number;
  feedbackTapped: number;
};

export const DEFAULT_LOCAL_USAGE: LocalUsage = {
  missionsStarted: 0,
  missionsCompleted: 0,
  missionsSkipped: 0,
  rewardsViewed: 0,
  rewardsRedeemed: 0,
  breathingStarted: 0,
  breathingCompleted: 0,
  breathingSkipped: 0,
  morningCompleted: 0,
  morningSkipped: 0,
  feedbackTapped: 0,
};

export async function loadLocalUsage(): Promise<LocalUsage> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_USAGE_KEY);
    if (!raw) return DEFAULT_LOCAL_USAGE;
    return { ...DEFAULT_LOCAL_USAGE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LOCAL_USAGE;
  }
}

export async function incrementLocalUsage(
  key: keyof LocalUsage,
  amount = 1,
): Promise<void> {
  try {
    const usage = await loadLocalUsage();
    const next = { ...usage, [key]: Math.max(0, usage[key] + amount) };
    await AsyncStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(next));
  } catch {
    // Local insight only. Never interrupt the child or parent flow.
  }
}

export async function resetLocalUsage(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LOCAL_USAGE_KEY,
      JSON.stringify(DEFAULT_LOCAL_USAGE),
    );
  } catch {}
}
