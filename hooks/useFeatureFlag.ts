import { booleanSetting, useStoredSetting } from './useStoredSetting';

// Pro features are opt-in: a flag that was never stored is off.
const featureFlag = booleanSetting(false);

export const useFeatureFlag = (key: string) => useStoredSetting(key, featureFlag);
