import { describe, it, expect } from "vitest";
import { isValidMeetingUrl, isGoogleMeetUrl } from "./meeting-url";

describe("isValidMeetingUrl", () => {
  it("aceita https", () => expect(isValidMeetingUrl("https://meet.google.com/abc")).toBe(true));
  it("rejeita http", () => expect(isValidMeetingUrl("http://evil.com")).toBe(false));
  it("rejeita javascript", () => expect(isValidMeetingUrl("javascript:alert(1)")).toBe(false));
  it("rejeita string vazia", () => expect(isValidMeetingUrl("")).toBe(false));
});

describe("isGoogleMeetUrl", () => {
  it("identifica meet.google.com", () => expect(isGoogleMeetUrl("https://meet.google.com/abc-def")).toBe(true));
  it("não confunde com outro domínio", () => expect(isGoogleMeetUrl("https://zoom.us/j/123")).toBe(false));
});
