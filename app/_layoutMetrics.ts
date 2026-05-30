import { Dimensions } from "react-native";
import { BUDDY_FIXED_SPACER } from "./_constants";

const { width, height } = Dimensions.get("window");
const shortestSide = Math.min(width, height);

export const IS_TABLET_WIDTH = shortestSide >= 600;
export const IS_SHORT_HEIGHT = height < 760;
export const CONTENT_MAX_WIDTH = IS_TABLET_WIDTH ? 560 : 440;
export const FORM_MAX_WIDTH = IS_TABLET_WIDTH ? 460 : 420;
export const SCREEN_PADDING = IS_TABLET_WIDTH ? 24 : 20;
export const BUDDY_CONTENT_SPACER = IS_SHORT_HEIGHT
  ? 220
  : IS_TABLET_WIDTH
    ? 250
    : BUDDY_FIXED_SPACER;

export const createSpacer = (height = BUDDY_CONTENT_SPACER) => ({ height });
