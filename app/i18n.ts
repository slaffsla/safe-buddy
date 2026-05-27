// i18n.ts — SafeBuddy localization setup
// Russian is the canonical source. English is the first translated locale.
// Architecture supports Hebrew, Arabic, Spanish without code changes — just
// drop a new JSON in /locales and add an `import` + entry in the I18n map.
//
// Reactivity: locale starts from the device but can be overridden by the
// saved Parent settings language toggle.

import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import en from "../locales/en.json";
import he from "../locales/he.json";
import ru from "../locales/ru.json";

export const i18n = new I18n({ ru, en, he });
i18n.defaultLocale = "ru";
i18n.enableFallback = true; // Missing keys fall back to ru.json

export type AppLocale = "ru" | "en" | "he";
export type RtlChildSex = "male" | "female";

export function normalizeAppLocale(
  locale: string | null | undefined,
): AppLocale {
  if (locale?.startsWith("he")) return "he";
  return locale?.startsWith("en") ? "en" : "ru";
}

// Device language → app locale. Unknown languages fall back to ru.
const deviceLang = getLocales()[0]?.languageCode ?? "ru";
i18n.locale = normalizeAppLocale(deviceLang);

export function getAppLocale(): AppLocale {
  return normalizeAppLocale(i18n.locale);
}

export function setAppLocale(locale: AppLocale) {
  i18n.locale = locale;
}

/**
 * Translate a key. Optional params for {{interpolation}}.
 * Falls back to ru.json if the key is missing in the current locale.
 */
export const t = (key: string, params?: Record<string, unknown>): string =>
  i18n.t(key, params);

/**
 * Speech-specific localization with optional RTL sex-aware variant selection.
 * If `sex` is "female" and locale is RTL, tries `${key}_female` first.
 */
export function tSpeak(
  key: string,
  params?: Record<string, unknown>,
  sex: RtlChildSex = "male",
): string {
  const loc = i18n.locale ?? "ru";
  const rtl = loc.startsWith("he") || loc.startsWith("ar");
  if (rtl && sex === "female") {
    const femaleKey = `${key}_female`;
    const femaleText = i18n.t(femaleKey, params);
    if (femaleText !== femaleKey) return femaleText;
  }
  return i18n.t(key, params);
}

/**
 * Returns the localized mission title, or the provided fallback (used for
 * user-added custom missions whose ids don't appear in the locale files).
 */
export function tMissionTitle(id: number, fallback: string): string {
  return i18n.t(`missions.${id}.title`, { defaultValue: fallback });
}

/**
 * Returns the localized mission subtitle, or the provided fallback.
 */
export function tMissionSubtitle(id: number, fallback: string): string {
  return i18n.t(`missions.${id}.subtitle`, { defaultValue: fallback });
}

/**
 * Returns the localized reward title, or the provided fallback.
 */
export function tRewardTitle(id: number, fallback: string): string {
  return i18n.t(`reward_titles.r${id}`, { defaultValue: fallback });
}

/**
 * Returns the localized demo step title, or the provided fallback.
 */
export function tDemoStepTitle(id: string, fallback: string): string {
  return i18n.t(`demoSteps.${id}.title`, { defaultValue: fallback });
}

/**
 * Returns the localized demo step praise, or the provided fallback.
 */
export function tDemoStepPraise(id: string, fallback: string): string {
  return i18n.t(`demoSteps.${id}.praise`, { defaultValue: fallback });
}

/**
 * BCP-47 language tag for the TTS engine. The TTS language follows the UI
 * language — a Spanish child needs es-ES TTS, a Hebrew child needs he-IL.
 * Unknown locales fall back to ru-RU so audio always works.
 */
export function getTtsLanguage(): string {
  const loc = i18n.locale ?? "ru";
  if (loc.startsWith("he")) return "he-IL";
  if (loc.startsWith("ar")) return "ar-SA";
  if (loc.startsWith("es")) return "es-ES";
  if (loc.startsWith("en")) return "en-US";
  return "ru-RU";
}

/** True for right-to-left UI languages. Reserved for future layout work. */
export function isRtl(): boolean {
  const loc = i18n.locale ?? "ru";
  return loc.startsWith("he") || loc.startsWith("ar");
}

// Expo Router: suppress "missing default export" warning for non-route files
const PlaceholderComponent = () => null;
export default PlaceholderComponent;
