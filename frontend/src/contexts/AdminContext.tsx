import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAdminOverride,
  setAdminOverride as setAxiosAdminOverride,
} from "../lib/api";
import { useAuth } from "./AuthContext";

type AdminContextValue = {
  isAdminOverride: boolean;
  setAdminOverride: (next: boolean) => void;
  isEffectiveAdmin: boolean;
  isJwtAdmin: boolean;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdminOverride, setOverrideState] = useState<boolean>(
    getAdminOverride(),
  );

  const setAdminOverride = useCallback((next: boolean) => {
    setAxiosAdminOverride(next);
    setOverrideState(next);
  }, []);

  const isJwtAdmin = user?.role === "admin";

  const value = useMemo<AdminContextValue>(
    () => ({
      isAdminOverride,
      setAdminOverride,
      isEffectiveAdmin: isJwtAdmin || isAdminOverride,
      isJwtAdmin,
    }),
    [isAdminOverride, isJwtAdmin, setAdminOverride],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
