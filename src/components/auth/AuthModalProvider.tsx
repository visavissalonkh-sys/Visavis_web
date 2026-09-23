"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal, type SessionUser } from "@/components/auth/AuthModal";

type AuthModalContextValue = {
  openAuthModal: (onSuccess?: (user: SessionUser) => void) => void;
  closeAuthModal: () => void;
  /** Bumps every successful login — components can re-fetch /api/auth/me when this changes. */
  authVersion: number;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

function AuthRequiredQueryHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    if (searchParams.get("auth") !== "required") return;

    const next = searchParams.get("next");
    // Open the modal and only THEN navigate — on success, not before. Routing
    // to `next` immediately would hit proxy.ts while still unauthenticated
    // and bounce straight back here in a loop.
    openAuthModal(() => {
      if (next) router.push(next);
    });

    const params = new URLSearchParams(searchParams);
    params.delete("auth");
    params.delete("next");
    const query = params.toString();
    router.replace(window.location.pathname + (query ? `?${query}` : ""));
    // Intentionally runs once on mount: this component lives once at the app
    // root and only needs to react to the `?auth=required` link a redirect
    // (e.g. from proxy.ts) lands the user on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [authVersion, setAuthVersion] = useState(0);
  const onSuccessRef = useRef<((user: SessionUser) => void) | undefined>(undefined);
  const router = useRouter();

  const openAuthModal = useCallback((onSuccess?: (user: SessionUser) => void) => {
    onSuccessRef.current = onSuccess;
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal, authVersion }}>
      {children}
      <Suspense fallback={null}>
        <AuthRequiredQueryHandler />
      </Suspense>
      {isOpen && (
        <AuthModal
          onClose={closeAuthModal}
          onAuthenticated={(user) => {
            setIsOpen(false);
            setAuthVersion((v) => v + 1);
            onSuccessRef.current?.(user);
            router.refresh();
          }}
        />
      )}
    </AuthModalContext.Provider>
  );
}
