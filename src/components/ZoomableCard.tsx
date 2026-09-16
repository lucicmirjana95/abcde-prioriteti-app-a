import React, { useState, useEffect, useContext } from "react";
import { Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { ZoomableContext } from "./ZoomableGroup";

interface ZoomableCardProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  title?: string;
}

export default function ZoomableCard({
  children,
  id: providedId,
  className = "",
  title,
}: ZoomableCardProps) {
  const [internalId] = useState(
    () => providedId || "zoom_card_" + Math.random().toString(36).substr(2, 9),
  );
  const context = useContext(ZoomableContext);
  const registerCard = context?.registerCard;
  const unregisterCard = context?.unregisterCard;

  useEffect(() => {
    if (registerCard) {
      registerCard(internalId);
    }
    return () => {
      if (unregisterCard) {
        unregisterCard(internalId);
      }
    };
  }, [internalId, registerCard, unregisterCard]);

  const [isZoomedInternal, setIsZoomedInternal] = useState(false);

  const toggleZoom = (e: React.MouseEvent) => {
    // Avoid Zoom toggle if clicking on interactive buttons inside
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.tagName === "INPUT" ||
      target.closest("a") ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.closest(".no-zoom")
    ) {
      return;
    }

    if (context) {
      context.openZoom(internalId);
    } else {
      setIsZoomedInternal(!isZoomedInternal);
    }
  };

  const isActive = context ? context.activeId === internalId : isZoomedInternal;

  return (
    <>
      <div
        id={internalId}
        onClick={toggleZoom}
        className={`relative rounded-xl overflow-hidden border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] transition-all duration-300 cursor-zoom-in ${className} ${
          isActive && !context // fallback styles if no context
            ? "ring-2 z-20 scale-[1.025]"
            : "hover:border-[#C7C7CC] dark:hover:border-[#3A3A3C]"
        }`}
      >
        {/* Quiet premium indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10 opacity-50 hover:opacity-100 transition-opacity">
          {title && (
            <span className="text-[11px] font-medium tracking-wide uppercase text-[#3C3C43] dark:text-[#EBEBF5]/80 pointer-events-none">
              {title}
            </span>
          )}
        </div>

        {/* Styled zoom viewport */}
        <div className="w-full h-full transition-transform duration-300 origin-center">
          {children}
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isActive && (
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
                onClick={() =>
                  context ? context.openZoom(null) : setIsZoomedInternal(false)
                }
              >
                <motion.div
                  drag={context ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset }) => {
                    if (context) {
                      if (offset.x < -50) context.nextCard();
                      if (offset.x > 50) context.prevCard();
                    }
                  }}
                  key={internalId}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="w-full max-w-3xl bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-[12px] border border-black/5 dark:border-white/5 overflow-y-auto max-h-[90vh] relative p-6 sm:p-8 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      context
                        ? context.openZoom(null)
                        : setIsZoomedInternal(false)
                    }
                    className="absolute top-6 right-6 p-2 rounded-xl bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white dark:hover:text-white transition-colors cursor-pointer z-[110]"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>

                  {title && (
                    <div className="mb-4 pr-12">
                      <span className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF]">
                        🔬 {title}
                      </span>
                    </div>
                  )}

                  <div className="prose dark:prose-invert max-w-none text-base sm:text-lg [&_p]:text-base sm:[&_p]:text-xl [&_h3]:text-2xl [&_h4]:text-xl [&_span]:!text-base sm:[&_span]:!text-lg [&_div]:text-base sm:[&_div]:text-lg">
                    {children}
                  </div>

                  {/* Indicator dots directly using context.totalCards */}
                  {context && context.totalCards > 1 && (
                    <div className="mt-8 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between z-10 bg-white dark:bg-[#1C1C1E]">
                      <button
                        onClick={context.prevCard}
                        disabled={context.activeIndex === 0}
                        className="p-2 rounded-full hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      <div className="flex gap-1.5 flex-1 mx-4 overflow-x-auto items-center justify-center min-h-[20px]">
                        {Array.from({ length: context.totalCards }).map(
                          (_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full shrink-0 transition-all ${i === context.activeIndex ? "w-4 bg-[#007AFF]" : "w-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] dark:bg-white/5"}`}
                            />
                          ),
                        )}
                      </div>

                      <button
                        onClick={context.nextCard}
                        disabled={
                          context.activeIndex === context.totalCards - 1
                        }
                        className="p-2 rounded-full hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
