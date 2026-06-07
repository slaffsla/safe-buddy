export const CHILD_PREFERENCES_MAX = 24;

export type ChildPreferenceKind = "love" | "comfort";
export type ChildPreferenceFrequency = "rare" | "sometimes";

export interface ChildPreference {
  id: number;
  kind: ChildPreferenceKind;
  title: string;
  emoji: string;
  note: string;
  enabled: boolean;
  frequency: ChildPreferenceFrequency;
}

export type ChildPreferenceUse = "motivation" | "calming";

export function normalizeChildPreferences(value: unknown): ChildPreference[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<number>();
  let nextId = 1;

  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Partial<ChildPreference>;
      const title =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : "";
      if (!title) return null;

      const kind: ChildPreferenceKind =
        item.kind === "comfort" ? "comfort" : "love";
      const frequency: ChildPreferenceFrequency =
        item.frequency === "sometimes" ? "sometimes" : "rare";
      const emoji =
        typeof item.emoji === "string" && item.emoji.trim()
          ? item.emoji.trim().slice(0, 4)
          : kind === "comfort"
            ? "🤍"
            : "⭐";
      const note =
        typeof item.note === "string" ? item.note.trim().slice(0, 120) : "";
      let id =
        typeof item.id === "number" && Number.isFinite(item.id)
          ? Math.trunc(item.id)
          : 0;

      if (id <= 0 || used.has(id)) {
        while (used.has(nextId)) nextId += 1;
        id = nextId;
        nextId += 1;
      }
      used.add(id);

      return {
        id,
        kind,
        title: title.slice(0, 40),
        emoji,
        note,
        enabled: item.enabled !== false,
        frequency,
      };
    })
    .filter((item): item is ChildPreference => !!item)
    .slice(0, CHILD_PREFERENCES_MAX);
}

export function enabledPreferencesByKind(
  value: unknown,
  kind: ChildPreferenceKind,
): ChildPreference[] {
  return normalizeChildPreferences(value).filter(
    (item) => item.enabled && item.kind === kind,
  );
}

export function preferenceKindForUse(
  use: ChildPreferenceUse,
): ChildPreferenceKind {
  return use === "calming" ? "comfort" : "love";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function pickPreferenceForUse(
  value: unknown,
  use: ChildPreferenceUse,
  seed: string,
): ChildPreference | null {
  const kind = preferenceKindForUse(use);
  const candidates = enabledPreferencesByKind(value, kind);
  if (candidates.length === 0) return null;

  const baseHash = hashString(`${use}:${seed}`);
  const index = baseHash % candidates.length;
  const preference = candidates[index];
  const frequencyGate = hashString(`${use}:${seed}:${preference.id}`) % 10;
  const devBoost =
    typeof __DEV__ !== "undefined" && __DEV__ && use === "calming";
  const threshold = devBoost
    ? 9
    : preference.frequency === "sometimes"
      ? 4
      : 1;

  return frequencyGate <= threshold ? preference : null;
}
