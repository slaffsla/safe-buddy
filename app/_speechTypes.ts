export type SpeechIntent = "instruction" | "buddyTap" | "ambientPlay";

export type SpeechLayering = "replace" | "dj";

export type SpeechCallOptions = {
  volume?: number;
  intent?: SpeechIntent;
  layering?: SpeechLayering;
};

export type SpeakFn = (text: string, options?: SpeechCallOptions) => void;
