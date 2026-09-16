import React from "react";

export type GrowthPathVariant = "header" | "loading" | "medallion" | "banner";
export type MedallionType = "stones" | "plant" | "waves" | "sun";

interface Props {
  variant?: GrowthPathVariant;
  medallionType?: MedallionType;
  className?: string;
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
}

export default function GrowthPathArt({
  variant = "header",
  medallionType = "plant",
  className = "",
  size = 40,
  "aria-hidden": ariaHidden = true,
}: Props) {
  if (variant === "medallion") {
    const srcMap: Record<MedallionType, string> = {
      plant: "/app-a/growth-path-medallion-plant.png",
      stones: "/app-a/growth-path-medallion-stones.png",
      waves: "/app-a/growth-path-medallion-waves.png",
      sun: "/app-a/growth-path-horizon.png",
    };

    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={ariaHidden}
      >
        <img
          src={srcMap[medallionType]}
          alt=""
          className="h-full w-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      </div>
    );
  }

  if (variant === "loading") {
    return (
      <div
        className={`app-a-growth-loading-art pointer-events-none select-none relative mx-auto ${className}`}
        style={size && size !== 40 ? { maxWidth: size } : undefined}
        aria-hidden={ariaHidden}
      >
        <img
          src="/app-a/growth-path-watercolor-light.png"
          alt=""
          className="app-a-growth-art app-a-growth-art-light app-a-growth-loading-glow"
          draggable={false}
        />
        <img
          src="/app-a/growth-path-watercolor-evening-moon-v4.png"
          alt=""
          className="app-a-growth-art app-a-growth-art-evening app-a-growth-loading-glow"
          draggable={false}
        />
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-[20px] select-none ${className}`}
        aria-hidden={ariaHidden}
      >
        <img
          src="/app-a/growth-path-horizon.png"
          alt=""
          className="w-full h-auto object-cover select-none pointer-events-none"
          draggable={false}
        />
      </div>
    );
  }

  // variant === "header" (Primary flow header art)
  return (
    <div
      className={`app-a-growth-header-art pointer-events-none select-none ${className}`}
      aria-hidden={ariaHidden}
    >
      <img
        src="/app-a/growth-path-watercolor-light.png"
        alt=""
        className="app-a-growth-art app-a-growth-art-light"
        draggable={false}
      />
      <img
        src="/app-a/growth-path-watercolor-evening-moon-v4.png"
        alt=""
        className="app-a-growth-art app-a-growth-art-evening"
        draggable={false}
      />
    </div>
  );
}
