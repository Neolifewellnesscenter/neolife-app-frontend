import { Dimensions, PixelRatio } from "react-native";

const { width, height } = Dimensions.get("window");

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

export const isSmallPhone = width < 360;
export const isMediumPhone = width >= 360 && width < 430;
export const isLargePhone = width >= 430;

export const wp = (percent: number) =>
  (width * percent) / 100;

export const hp = (percent: number) =>
  (height * percent) / 100;

export const scale = (size: number) =>
  (width / BASE_WIDTH) * size;

export const verticalScale = (size: number) =>
  (height / BASE_HEIGHT) * size;

export const moderateScale = (
  size: number,
  factor = 0.35
) => {
  const scaled = scale(size);

  return size + (scaled - size) * factor;
};

export const fontSize = (size: number) => {
  const newSize = moderateScale(size, 0.3);

  return Math.round(
    PixelRatio.roundToNearestPixel(newSize)
  );
};

export const horizontalPadding =
  width < 360 ? 14 :
  width < 430 ? 16 :
  20;