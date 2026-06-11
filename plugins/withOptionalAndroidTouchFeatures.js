const { withAndroidManifest } = require("@expo/config-plugins");

const ANDROID_NS = "http://schemas.android.com/apk/res/android";
const TOOLS_NS = "http://schemas.android.com/tools";

const OPTIONAL_TOUCH_FEATURES = [
  "android.hardware.faketouch",
  "android.hardware.touchscreen",
];

function upsertOptionalFeature(features, name) {
  const existing = features.find((feature) => feature.$?.["android:name"] === name);
  if (existing) {
    existing.$ = {
      ...existing.$,
      "android:required": "false",
      "tools:replace": "android:required",
    };
    return;
  }

  features.push({
    $: {
      "android:name": name,
      "android:required": "false",
      "tools:replace": "android:required",
    },
  });
}

module.exports = function withOptionalAndroidTouchFeatures(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = {
      ...manifest.$,
      "xmlns:android": manifest.$?.["xmlns:android"] ?? ANDROID_NS,
      "xmlns:tools": manifest.$?.["xmlns:tools"] ?? TOOLS_NS,
    };

    const features = manifest["uses-feature"] ?? [];
    OPTIONAL_TOUCH_FEATURES.forEach((name) =>
      upsertOptionalFeature(features, name),
    );
    manifest["uses-feature"] = features;

    return config;
  });
};
