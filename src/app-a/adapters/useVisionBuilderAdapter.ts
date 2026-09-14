import { useMemo, useEffect, useRef } from "react";
import { VisionBuilderController } from "../domain/vision/VisionBuilderController";

export function useVisionBuilderAdapter() {
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const controller = useMemo(() => new VisionBuilderController({
    saveVisionStrategy: async (u, s) => {
      const { saveVisionStrategy } = await import("../../shared/persistence/vision");
      return saveVisionStrategy(u, s);
    },
    createVisionStrategy: async (i, h) => {
      const { createVisionStrategy } = await import("../api/visionStrategyApi");
      return createVisionStrategy(i, h as any);
    }
  }), []);

  return { controller, isMounted };
}
