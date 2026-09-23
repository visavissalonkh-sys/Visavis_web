"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal, type SessionUser } from "@/components/auth/AuthModal";

type AuthModalContextValue = {
  openAuthModal: (onSuccess?: (user: SessionUser) => void) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

function AuthRequiredQueryHandler({ onTrigger }: { onTrigger: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("auth") !== "required") return;
    onTrigger();
    const params = new URLSearchParams(searchParams);
    const next = params.get("next");
    params.delete("auth");
    params.delete("next");
    const query = params.toString();
    router.replace(next && next !== "" ? next : window.location.pathname + (query ? `?${query}` : ""));
    // Intentionally runs once on mount: this component lives once at the app
    // root and only needs to react to the `?auth=required` link a redirect
    // (e.g. from proxy.ts) lands the user on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const onSuccessRef = useRef<((user: SessionUser) => void) | undefined>(undefined);
  const router = useRouter();

  const openAuthModal = useCallback((onSuccess?: (user: SessionUser) => void) => {
    onSuccessRef.current = onSuccess;
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      <Suspense fallback={null}>
        <AuthRequiredQueryHandler onTrigger={() => setIsOpen(true)} />
      </Suspense>
      {isOpen && (
        <AuthModal
          onClose={closeAuthModal}
          onAuthenticated={(user) => {
            setIsOpen(false);
            onSuccessRef.current?.(user);
            router.refresh();
          }}
        />
      )}
    </AuthModalContext.Provider>
  );
}
