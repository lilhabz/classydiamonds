"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { signOut } from "next-auth/react";

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [remaining, setRemaining] = useState(INACTIVITY_LIMIT);

  useEffect(() => {
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
    };
  }, []);

  return (
    <IdleTimerContext.Provider value={{ remaining }}>
      {children}
    </IdleTimerContext.Provider>
  );
}
