import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

interface ZoomableContextType {
  registerCard: (id: string) => void;
  unregisterCard: (id: string) => void;
  openZoom: (id: string | null) => void;
  activeId: string | null;
  activeIndex: number;
  totalCards: number;
  nextCard: (e?: React.MouseEvent) => void;
  prevCard: (e?: React.MouseEvent) => void;
}

export const ZoomableContext = createContext<ZoomableContextType | null>(null);

export function ZoomableGroup({ children }: { children: ReactNode }) {
  const cardsRef = useRef<string[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const registerCard = useCallback((id: string) => {
    if (!cardsRef.current.includes(id)) {
      cardsRef.current.push(id);
      setTotalCards(cardsRef.current.length);
    }
  }, []);

  const unregisterCard = useCallback((id: string) => {
    cardsRef.current = cardsRef.current.filter((p) => p !== id);
    setTotalCards(cardsRef.current.length);
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  const openZoom = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  const activeIndex = cardsRef.current.indexOf(activeId || "");

  const prevCard = useCallback(
    (e?: Event | React.MouseEvent) => {
      if (e && "stopPropagation" in e) e.stopPropagation();
      const idx = cardsRef.current.indexOf(activeId || "");
      if (idx > 0) setActiveId(cardsRef.current[idx - 1]);
    },
    [activeId],
  );

  const nextCard = useCallback(
    (e?: Event | React.MouseEvent) => {
      if (e && "stopPropagation" in e) e.stopPropagation();
      const idx = cardsRef.current.indexOf(activeId || "");
      if (idx !== -1 && idx < cardsRef.current.length - 1)
        setActiveId(cardsRef.current[idx + 1]);
    },
    [activeId],
  );

  const contextValue = useMemo(
    () => ({
      registerCard,
      unregisterCard,
      openZoom,
      activeId,
      activeIndex,
      totalCards,
      nextCard,
      prevCard,
    }),
    [
      registerCard,
      unregisterCard,
      openZoom,
      activeId,
      activeIndex,
      totalCards,
      nextCard,
      prevCard,
    ],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeId) return;
      if (e.key === "ArrowLeft") prevCard();
      if (e.key === "ArrowRight") nextCard();
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId, nextCard, prevCard]);

  return (
    <ZoomableContext.Provider value={contextValue}>
      {children}
    </ZoomableContext.Provider>
  );
}
