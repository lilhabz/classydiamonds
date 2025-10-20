// context/FavoritesContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

type FavoritesContextValue = {
  /** Array of product ids (or slugs) saved as favorites */
  favorites: string[];
  /** Has the client finished hydrating favorites from storage/API? */
  rehydrated: boolean;
  /** Check if a product is in favorites */
  isFavorite: (id: string) => boolean;
  /** Toggle favorite on/off for a given id */
  toggleFavorite: (id: string) => void;
  /** Explicitly set favorite state for an id */
  setFavorite: (id: string, value: boolean) => void;
  /** Clear all favorites (rarely used, handy for debugging) */
  clearFavorites: () => void;
};

const LOCAL_KEY = "cd:favorites:v1";

const noop = () => {};
const defaultValue: FavoritesContextValue = {
  favorites: [],
  rehydrated: false,
  isFavorite: () => false,
  toggleFavorite: noop,
  setFavorite: noop,
  clearFavorites: noop,
};

const FavoritesContext = createContext<FavoritesContextValue>(defaultValue);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const [favorites, setFavorites] = useState<string[]>([]);
  const [rehydrated, setRehydrated] = useState(false);

  // Helpers
  const dedupe = (list: string[]) => Array.from(new Set(list.filter(Boolean)));

  const readLocal = (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  };

  const writeLocal = (list: string[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(dedupe(list)));
    } catch {
      // ignore quota errors
    }
  };

  const fetchServerFavorites = async (): Promise<string[] | null> => {
    try {
      const res = await fetch("/api/account/favorites", { method: "GET" });
      if (!res.ok) return null;
      const json = (await res.json()) as { favorites?: string[] };
      return Array.isArray(json?.favorites) ? json.favorites : [];
    } catch {
      return null;
    }
  };

  const pushServerFavorites = async (list: string[]) => {
    // Fire-and-forget; UI updates optimistically
    try {
      await fetch("/api/account/favorites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites: dedupe(list) }),
      });
    } catch {
      // ignore network errors; local state still correct and will re-merge later
    }
  };

  // Initial rehydrate: localStorage for guests, API (+ merge) for signed-in users
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const local = readLocal();

      if (status !== "authenticated" || !userId) {
        if (cancelled) return;
        setFavorites(dedupe(local));
        setRehydrated(true);
        return;
      }

      const server = (await fetchServerFavorites()) ?? [];
      const merged = dedupe([...server, ...local]);

      if (cancelled) return;
      setFavorites(merged);
      setRehydrated(true);
      writeLocal(merged);
      pushServerFavorites(merged);
    };

    hydrate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  // Keep localStorage in sync whenever favorites change
  useEffect(() => {
    if (!rehydrated) return;
    writeLocal(favorites);
  }, [favorites, rehydrated]);

  // Cross-tab sync (listen to storage events)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY && typeof e.newValue === "string") {
        try {
          const next = JSON.parse(e.newValue) as string[];
          setFavorites((prev) => {
            const merged = dedupe([...prev, ...next]);
            return merged.length === prev.length &&
              merged.every((x, i) => x === prev[i])
              ? prev
              : merged;
          });
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isFavorite = (id: string) => favorites.includes(id);

  const setFavorite = (id: string, value: boolean) => {
    setFavorites((prev) => {
      const next = value ? dedupe([id, ...prev]) : prev.filter((x) => x !== id);
      // Push to server if signed in
      if (rehydrated && status === "authenticated" && userId) {
        pushServerFavorites(next);
      }
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorite(id, !isFavorite(id));
  };

  const clearFavorites = () => {
    setFavorites([]);
    writeLocal([]);
    if (status === "authenticated" && userId) {
      pushServerFavorites([]);
    }
  };

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      rehydrated,
      isFavorite,
      toggleFavorite,
      setFavorite,
      clearFavorites,
    }),
    [favorites, rehydrated]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
