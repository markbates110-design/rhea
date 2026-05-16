export const INSTALL_CORE_ACTION_EVENT = "grubgauge:core-action-completed";
export const INSTALL_ELIGIBLE_KEY = "grubgauge_install_prompt_eligible";
export const INSTALL_DISMISSED_UNTIL_KEY = "grubgauge_install_prompt_dismissed_until";
export const INSTALL_INSTALLED_KEY = "grubgauge_install_prompt_installed";
export const INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function notifyCoreActionCompleted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSTALL_ELIGIBLE_KEY, "true");
  window.dispatchEvent(new CustomEvent(INSTALL_CORE_ACTION_EVENT));
}
