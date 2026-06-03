import { ImageSourcePropType } from "react-native";

export const visualAssets = {
  accents: {
    sprigLean: require("../assets/elements/Graphics Element1.png"),
    sprigUpright: require("../assets/elements/Graphics Element2.png"),
    hearts: require("../assets/elements/Graphics Element3.png"),
    stars: require("../assets/elements/Graphics Element4.png"),
    magic: require("../assets/elements/Graphics Element5.png"),
    settingsLeaf: require("../assets/elements/Graphics Element6.png"),
  },
  graphics: {
    sunrise: require("../assets/Graphics/Graphics1.png"),
    realLifeDone: require("../assets/Graphics/Graphics2.png"),
    schedule: require("../assets/Graphics/Graphics3.png"),
    star: require("../assets/Graphics/Graphics4.png"),
    settings: require("../assets/Graphics/Graphics5.png"),
    parentZone: require("../assets/Graphics/Graphics6.png"),
    rewardGift: require("../assets/Graphics/Graphics7.png"),
    scheduleClock: require("../assets/Graphics/Graphics8.png"),
    breathingBuddy: require("../assets/Graphics/Graphics9.png"),
    missionRocket: require("../assets/Graphics/Graphics10.png"),
    rewardGiftAlt: require("../assets/Graphics/Graphics11.png"),
    breathSwirl: require("../assets/Graphics/Graphics12.png"),
    settingsSliders: require("../assets/Graphics/Graphics13.png"),
    completeBadge: require("../assets/Graphics/Graphics14.png"),
    buddyBubble: require("../assets/Graphics/BubbleTL4.png"),
    buddyBubbleSoft: require("../assets/Graphics/Graphics15.bubble0.png"),
    handpan: require("../assets/Graphics/Handpan.png"),
  },
} satisfies {
  accents: Record<string, ImageSourcePropType>;
  graphics: Record<string, ImageSourcePropType>;
};

export type VisualAssetSource = ImageSourcePropType;
