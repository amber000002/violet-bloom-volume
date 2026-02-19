// Canonical channel normalization utility
// All channel references in the app should pass through normalizeChannel()

export type CanonicalChannel = "email" | "push" | "whatsapp" | "in_app" | "sms" | "app_inbox";

const ALIAS_MAP: Record<string, CanonicalChannel> = {
  email: "email",
  push: "push",
  push_notification: "push",
  pushnotification: "push",
  web_push: "push",
  webpush: "push",
  in_app: "in_app",
  inapp: "in_app",
  in_app_message: "in_app",
  in_app_messages: "in_app",
  "in-app": "in_app",
  "in-app_message": "in_app",
  whatsapp: "whatsapp",
  wa: "whatsapp",
  whats_app: "whatsapp",
  sms: "sms",
  text_message: "sms",
  app_inbox: "app_inbox",
  inbox: "app_inbox",
  app_inbox_message: "app_inbox",
};

/**
 * Normalize any channel string to a canonical key.
 * Returns the canonical key or the cleaned input if no alias matches.
 */
export function normalizeChannel(input: string): CanonicalChannel | string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\s-]/g, "")   // remove punctuation
    .replace(/[\s-]+/g, "_");          // spaces/hyphens → underscore

  return ALIAS_MAP[cleaned] ?? cleaned;
}

/**
 * Normalize an array of channel strings, deduplicating results.
 */
export function normalizeChannels(channels: string[]): string[] {
  const set = new Set<string>();
  for (const ch of channels) {
    set.add(normalizeChannel(ch));
  }
  return Array.from(set);
}

/**
 * Check if two channel sets have any overlap (OR filtering).
 * Returns true if selectedChannels is empty (show all).
 */
export function channelsOverlap(
  useCaseChannels: string[],
  selectedChannels: string[]
): boolean {
  if (selectedChannels.length === 0) return true;
  if (useCaseChannels.length === 0) return true; // no channel info → include
  const normalizedUC = normalizeChannels(useCaseChannels);
  const normalizedSel = normalizeChannels(selectedChannels);
  return normalizedSel.some(ch => normalizedUC.includes(ch));
}

/** Display label for a canonical channel */
export const CHANNEL_DISPLAY_LABELS: Record<string, string> = {
  email: "Email",
  push: "Push",
  whatsapp: "WhatsApp",
  in_app: "In-App",
  sms: "SMS",
  app_inbox: "App Inbox",
};

/** All standard channel options for the UI selector */
export const CHANNEL_OPTIONS = [
  { id: "email" as CanonicalChannel, label: "Email" },
  { id: "push" as CanonicalChannel, label: "Push" },
  { id: "in_app" as CanonicalChannel, label: "In-App" },
  { id: "sms" as CanonicalChannel, label: "SMS" },
  { id: "whatsapp" as CanonicalChannel, label: "WhatsApp" },
] as const;
