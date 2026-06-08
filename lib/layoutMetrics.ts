import { Dimensions, useWindowDimensions } from "react-native";
import { BUDDY_FIXED_SPACER } from "../app/_constants";

type WindowSize = {
  width: number;
  height: number;
};

export function getLayoutMetrics({ width, height }: WindowSize) {
  const shortestSide = Math.min(width, height);
  const isTabletWidth = shortestSide >= 600;
  const isLargeTablet = shortestSide >= 720;
  const isShortHeight = height < 760;
  const buddyContentSpacer = isShortHeight
    ? 200
    : isLargeTablet
      ? 300
      : isTabletWidth
        ? 228
        : BUDDY_FIXED_SPACER;
  const homeContentSpacer =
    isTabletWidth && !isLargeTablet && !isShortHeight
      ? buddyContentSpacer + 88
      : buddyContentSpacer;
  const buddyViewportTop =
    buddyContentSpacer + (isLargeTablet ? 92 : isTabletWidth ? 64 : 52);

  return {
    isTabletWidth,
    isLargeTablet,
    isShortHeight,
    contentMaxWidth: isLargeTablet ? 720 : isTabletWidth ? 560 : 440,
    formMaxWidth: isLargeTablet ? 560 : isTabletWidth ? 460 : 420,
    screenPadding: isLargeTablet ? 32 : isTabletWidth ? 24 : 20,
    uiScale: isLargeTablet ? 1.16 : isTabletWidth ? 1.04 : 1,
    buddyContentSpacer,
    homeContentSpacer,
    buddyViewportTop,
    noOverlayTopPadding: isShortHeight
      ? 26
      : isLargeTablet
        ? 72
        : isTabletWidth
          ? 48
          : 32,
  };
}

export function useLayoutMetrics() {
  return getLayoutMetrics(useWindowDimensions());
}

const initialMetrics = getLayoutMetrics(Dimensions.get("window"));

export const IS_TABLET_WIDTH = initialMetrics.isTabletWidth;
export const IS_LARGE_TABLET = initialMetrics.isLargeTablet;
export const IS_SHORT_HEIGHT = initialMetrics.isShortHeight;
export const CONTENT_MAX_WIDTH = initialMetrics.contentMaxWidth;
export const FORM_MAX_WIDTH = initialMetrics.formMaxWidth;
export const SCREEN_PADDING = initialMetrics.screenPadding;
export const UI_SCALE = initialMetrics.uiScale;
export const BUDDY_CONTENT_SPACER = initialMetrics.buddyContentSpacer;
export const HOME_CONTENT_SPACER = initialMetrics.homeContentSpacer;
export const BUDDY_VIEWPORT_TOP = initialMetrics.buddyViewportTop;
export const NO_OVERLAY_TOP_PADDING = initialMetrics.noOverlayTopPadding;

export const createSpacer = (height = BUDDY_CONTENT_SPACER) => ({ height });
