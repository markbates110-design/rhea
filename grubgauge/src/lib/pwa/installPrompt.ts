export const INSTALL_CORE_ACTION_EVENT = "grubgauge:core-action-completed";
export const INSTALL_ELIGIBLE_KEY = "grubgauge_install_prompt_eligible";

export function notifyCoreActionCompleted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSTALL_ELIGIBLE_KEY, "true");
  window.dispatchEvent(new CustomEvent(INSTALL_CORE_ACTION_EVENT));
}
