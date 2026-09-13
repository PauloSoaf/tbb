const ALLOWED_PROTOCOLS = ["https:"];
const GOOGLE_MEET_HOSTNAMES = ["meet.google.com"];

export function isValidMeetingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isGoogleMeetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return GOOGLE_MEET_HOSTNAMES.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
