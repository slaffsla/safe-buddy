/* eslint-env node */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const localeFiles = ["en", "he", "ru"].map((code) => ({
  code,
  file: path.join(root, "locales", `${code}.json`),
}));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fail(message) {
  console.error(`verify-locales: ${message}`);
  process.exitCode = 1;
}

const appJson = readJson(path.join(root, "app.json"));
const packageJson = readJson(path.join(root, "package.json"));
const packageLock = readJson(path.join(root, "package-lock.json"));
const appVersion = appJson.expo?.version;
const runtimeVersion = appJson.expo?.runtimeVersion;
const packageVersion = packageJson.version;
const lockVersion = packageLock.version;
const lockRootVersion = packageLock.packages?.[""]?.version;

if (appVersion !== packageVersion) {
  fail(`app.json version ${appVersion} does not match package.json ${packageVersion}`);
}
if (runtimeVersion !== appVersion) {
  fail(`runtimeVersion ${runtimeVersion} does not match app version ${appVersion}`);
}
if (lockVersion !== packageVersion || lockRootVersion !== packageVersion) {
  fail(`package-lock version does not match package.json ${packageVersion}`);
}

const constantsSource = fs.readFileSync(path.join(root, "app", "_constants.ts"), "utf8");
const missionPoolMatch = constantsSource.match(
  /export const MISSION_POOL:[\s\S]*?=\s*\[([\s\S]*?)\n\];/,
);
if (!missionPoolMatch) {
  fail("could not find MISSION_POOL in app/_constants.ts");
}
const missionPoolSource = missionPoolMatch?.[1] ?? "";
const missionIds = [...missionPoolSource.matchAll(/id:\s*(\d+),/g)].map((m) =>
  Number(m[1]),
);
const uniqueMissionIds = new Set(missionIds);
if (missionIds.length !== uniqueMissionIds.size) {
  fail("duplicate mission ids found in MISSION_POOL");
}

const builtInMissionIds = [...uniqueMissionIds].filter((id) => id < 1000);
const baseLocale = readJson(localeFiles[0].file);
const wonderFactKeys = Object.keys(baseLocale.tiny_wonder_facts ?? {});
const buddyWitKeys = Object.keys(baseLocale.tiny_buddy_wit ?? {});
for (const { code, file } of localeFiles) {
  const locale = readJson(file);
  for (const id of builtInMissionIds) {
    const mission = locale.missions?.[String(id)];
    if (!mission?.title || !mission?.subtitle) {
      fail(`${code}: missing missions.${id}.title/subtitle`);
    }
    if (!locale.tiny_facts?.[`f${id}`]) {
      fail(`${code}: missing tiny_facts.f${id}`);
    }
  }
  for (const key of wonderFactKeys) {
    if (!locale.tiny_wonder_facts?.[key]) {
      fail(`${code}: missing tiny_wonder_facts.${key}`);
    }
  }
  for (const key of buddyWitKeys) {
    if (!locale.tiny_buddy_wit?.[key]) {
      fail(`${code}: missing tiny_buddy_wit.${key}`);
    }
  }
}

if (!process.exitCode) {
  console.log(
    `verify-locales: ok (${builtInMissionIds.length} missions, ${localeFiles.length} locales)`,
  );
}
