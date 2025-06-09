"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in ms

interface IdleTimerContextValue {
  remaining: number;
}

const IdleTimerContext = createContext<IdleTimerContextValue | undefined>(
  undefined
);

export function useIdleTimer() {
  const context = useContext(IdleTimerContext);
  if (!context) {
    throw new Error("useIdleTimer must be used within IdleTimerProvider");
  }
  return context;
}

export default function IdleTimerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [remaining, setRemaining] = useState(INACTIVITY_LIMIT);

  useEffect(() => {
    if (!session?.user?.isAdmin || !router.pathname.startsWith("/admin")) {
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemaining(INACTIVITY_LIMIT);
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/" });
      }, INACTIVITY_LIMIT);
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => (prev > 1000 ? prev - 1000 : 0));
      }, 1000);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
      setRemaining(INACTIVITY_LIMIT);
    };
  }, [session, router.pathname]);

  return (
    <IdleTimerContext.Provider value={{ remaining }}>
      {children}
    </IdleTimerContext.Provider>
  );
}
