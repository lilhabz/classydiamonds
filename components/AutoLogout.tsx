import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in ms

const AutoLogout = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user?.isAdmin || !router.pathname.startsWith("/admin")) {
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/" });
      }, INACTIVITY_LIMIT);
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
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [session, router.pathname]);

  return null;
};

export default AutoLogout;
