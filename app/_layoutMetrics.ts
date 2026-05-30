import { Dimensions, useWindowDimensions } from "react-native";
import { BUDDY_FIXED_SPACER } from "./_constants";

type WindowSize = {
  width: number;
  height: number;
};

export function getLayoutMetrics({ width, height }: WindowSize) {
  const shortestSide = Math.min(width, height);
  const isTabletWidth = shortestSide >= 600;
  const isShortHeight = height < 760;

  return {
    isTabletWidth,
    isShortHeight,
    contentMaxWidth: isTabletWidth ? 560 : 440,
    formMaxWidth: isTabletWidth ? 460 : 420,
    screenPadding: isTabletWidth ? 24 : 20,
    buddyContentSpacer: isShortHeight
      ? 200
      : isTabletWidth
        ? 228
        : BUDDY_FIXED_SPACER,
    noOverlayTopPadding: isShortHeight ? 26 : isTabletWidth ? 44 : 32,
  };
}

export function useLayoutMetrics() {
  return getLayoutMetrics(useWindowDimensions());
}

const initialMetrics = getLayoutMetrics(Dimensions.get("window"));

export const IS_TABLET_WIDTH = initialMetrics.isTabletWidth;
export const IS_SHORT_HEIGHT = initialMetrics.isShortHeight;
export const CONTENT_MAX_WIDTH = initialMetrics.contentMaxWidth;
export const FORM_MAX_WIDTH = initialMetrics.formMaxWidth;
export const SCREEN_PADDING = initialMetrics.screenPadding;
export const BUDDY_CONTENT_SPACER = initialMetrics.buddyContentSpacer;
export const NO_OVERLAY_TOP_PADDING = initialMetrics.noOverlayTopPadding;

export const createSpacer = (height = BUDDY_CONTENT_SPACER) => ({ height });
