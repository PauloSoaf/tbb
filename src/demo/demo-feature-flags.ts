// Features intentionally disabled (or mocked) in Demo Mode. Anything flagged
// here must render as disabled UI with an "unavailable in demo" notice —
// never silently attempt the real backend path.

export const demoFeatureFlags = {
  nativeCall: false,
  googleMeet: false,
  aiRealProvider: false,
  pdfDownload: "mock",
  fileUpload: "mock",
} as const;
