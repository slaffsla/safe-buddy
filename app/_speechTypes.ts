export type SpeechIntent = "instruction" | "buddyTap" | "ambientPlay";

export type SpeechDelivery = "replace" | "djCut";

export type SpeechCallOptions = {
  volume?: number;
  intent?: SpeechIntent;
  delivery?: SpeechDelivery;
};

export type SpeakFn = (text: string, options?: SpeechCallOptions) => void;
