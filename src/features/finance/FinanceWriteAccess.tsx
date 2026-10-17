"use client";

import { createContext, useContext, type ReactNode } from "react";

const FinanceWriteContext = createContext(true);
export const useFinanceWriteAccess = () => useContext(FinanceWriteContext);
export function FinanceWriteProvider({ canWrite, children }: { canWrite: boolean; children: ReactNode }) {
  return <FinanceWriteContext.Provider value={canWrite}>{children}</FinanceWriteContext.Provider>;
}
export function FinanceWriteOnly({ children }: { children: ReactNode }) {
  return useFinanceWriteAccess() ? children : null;
}
