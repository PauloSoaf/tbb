// Maps each mutation domain to the cache tags it must invalidate.
// Use this as reference when adding new mutations — never invalidate
// more tags than listed here without a clear reason.

export const cacheInvalidationMap = {
  createAppointment: ["dashboard", "dashboard:appointments", "dashboard:stats", "agenda", "patient"],
  updateAppointment: ["dashboard", "dashboard:appointments", "agenda", "patient"],
  deleteAppointment: ["dashboard", "dashboard:appointments", "dashboard:stats", "agenda", "patient"],

  createPatient: ["dashboard", "dashboard:stats", "patients"],
  updatePatient: ["dashboard", "patients", "patient"],
  archivePatient: ["dashboard", "dashboard:stats", "patients", "patient"],

  createAnamnesis: ["dashboard", "dashboard:anamneses", "dashboard:attention", "dashboard:action", "patient", "patient:anamnesis"],
  reviewAnamnesis: ["dashboard", "dashboard:anamneses", "dashboard:attention", "patient", "patient:anamnesis"],

  createMealPlan: ["dashboard", "dashboard:action", "patient", "patient:mealPlans", "portal:mealPlan"],
  updateMealPlan: ["patient", "patient:mealPlans", "portal:mealPlan"],
  activateMealPlan: ["dashboard", "dashboard:action", "patient", "patient:mealPlans", "portal:mealPlan"],

  createEvaluation: ["dashboard", "dashboard:stats", "patient", "patient:evaluations"],
  updateEvaluation: ["patient", "patient:evaluations"],

  createGoal: ["patient", "patient:goals", "portal:goals"],
  updateGoal: ["patient", "patient:goals", "portal:goals"],
  deleteGoal: ["patient", "patient:goals", "portal:goals"],

  sendChatMessage: ["dashboard:messages", "portal:chat"],
  readChatMessages: ["dashboard:messages"],

  generateShoppingList: ["patient", "portal:shopping"],
  updateShoppingList: ["portal:shopping"],

  submitFoodDiary: ["portal:diary"],
  submitCheckin: ["dashboard", "dashboard:mood", "portal:checkin"],

  uploadFile: ["patient:files"],
  deleteFile: ["patient:files"],

  updateCareSession: ["careSessions", "patient:timeline"],
  createCareSession: ["careSessions", "dashboard", "dashboard:stats"],

  updateConfig: ["config"],
  updateTeam: ["team"],

  submitPortalTask: ["portal:tasks"],
  submitPortalWeight: ["portal:evolution"],
} as const;
