export type SpeechIntent = "instruction" | "buddyTap" | "ambientPlay";

export type SpeechDelivery = "replace" | "djCut";

export type SpeechCallOptions = {
  volume?: number;
  intent?: SpeechIntent;
  delivery?: SpeechDelivery;
};

export type SpeakFn = (text: string, options?: SpeechCallOptions) => void;

// Expo Router scans files in /app as routes. This file is type-only, but a
// default export keeps the router from warning when the dev server scans it.
export default function PlaceholderRoute() {
  return null;
}
