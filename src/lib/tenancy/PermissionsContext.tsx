"use client";

import React, { createContext, useContext, useMemo } from "react";

export interface PermissionsContextValue {
  permissions: Set<string>;
  isOwner: boolean;
  isGlobalAdmin: boolean;
  role: string;
  hasPermission: (resource: string, action?: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: new Set(),
  isOwner: false,
  isGlobalAdmin: false,
  role: "VIEWER",
  hasPermission: () => false,
});

export interface PermissionsProviderProps {
  permissions: string[];
  isOwner?: boolean;
  isGlobalAdmin?: boolean;
  role?: string;
  children: React.ReactNode;
}

export function PermissionsProvider({
  permissions,
  isOwner = false,
  isGlobalAdmin = false,
  role = "VIEWER",
  children,
}: PermissionsProviderProps) {
  const value = useMemo(() => {
    const permSet = new Set(permissions);
    const hasPermission = (resource: string, action?: string): boolean => {
      if (isGlobalAdmin || isOwner || role === "OWNER") return true;
      if (!action) {
        // check if user has any permission on the resource or full access
        for (const key of permSet) {
          if (key.startsWith(`${resource}.`)) return true;
        }
        return false;
      }
      const key = `${resource}.${action}`;
      return permSet.has(key);
    };

    return {
      permissions: permSet,
      isOwner,
      isGlobalAdmin,
      role,
      hasPermission,
    };
  }, [permissions, isOwner, isGlobalAdmin, role]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}

export function useCan(resource: string, action?: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(resource, action);
}

export interface CanProps {
  resource: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ resource, action, fallback = null, children }: CanProps) {
  const canAccess = useCan(resource, action);
  if (!canAccess) return <>{fallback}</>;
  return <>{children}</>;
}
