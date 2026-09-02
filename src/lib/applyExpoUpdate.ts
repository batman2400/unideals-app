import * as Updates from "expo-updates";

/**
 * Download and immediately apply a pending EAS Update.
 * No-ops in dev / when Updates is disabled.
 */
export async function applyExpoUpdateIfAvailable(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;

    const result = await Updates.fetchUpdateAsync();
    if (!result.isNew) return false;

    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}
