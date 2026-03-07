export enum Platform {
  Android = "android",
}

export const PLATFORM_VALUES: readonly Platform[] = [
  Platform.Android,
] as const;

export const PLATFORM_LABEL_SHORT: Record<Platform, string> = {
  [Platform.Android]: "Android",
};

export const PLATFORM_LABEL_LONG: Record<Platform, string> = {
  [Platform.Android]: "Android only",
};
