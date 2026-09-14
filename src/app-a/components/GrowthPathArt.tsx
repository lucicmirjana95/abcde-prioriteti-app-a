import React from "react";

export type GrowthPathVariant = "header" | "loading" | "medallion" | "banner";
export type MedallionType = "stones" | "plant" | "waves" | "dots" | "sun";

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
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={ariaHidden}
      >
        <svg
          viewBox="0 0 60 60"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full select-none"
        >
          <defs>
            {/* Medallion Gradients */}
            <linearGradient id="medallion-apricot-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--app-a-wash-apricot-badge, #FCE2D2)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--app-a-wash-apricot, #F8CDAF)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="medallion-lavender-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--app-a-wash-lavender-badge, #E8E2F5)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--app-a-wash-lavender, #D4CBEE)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="medallion-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--app-a-wash-dusty-blue-badge, #D9E9F7)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--app-a-wash-dusty-blue, #BED9EE)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="medallion-sage-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--app-a-wash-sage-badge, #D9EDDC)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--app-a-wash-sage, #BFDEC5)" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {medallionType === "plant" && (
            <g>
              <circle cx="30" cy="30" r="28" fill="url(#medallion-apricot-grad)" />
              <circle cx="30" cy="30" r="27.5" stroke="var(--app-a-wash-apricot-border, #DC8258)" strokeWidth="1" strokeOpacity="0.4" />
              {/* Botanical plant twig with graceful leaves */}
              <path
                d="M 30 46 C 30 38, 29 26, 32 16"
                stroke="var(--app-a-wash-apricot-text, #8E4420)"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Leaves */}
              <path
                d="M 30 38 C 24 36, 20 32, 21 28 C 24 28, 28 32, 30 36"
                fill="var(--app-a-wash-sage-text, #2D583B)"
                opacity="0.88"
              />
              <path
                d="M 30 32 C 36 30, 40 26, 39 22 C 36 22, 32 26, 30 30"
                fill="var(--app-a-wash-sage-text, #2D583B)"
                opacity="0.88"
              />
              <path
                d="M 31 24 C 26 22, 23 18, 24 15 C 27 15, 30 19, 31 22"
                fill="var(--app-a-wash-sage-text, #2D583B)"
                opacity="0.88"
              />
              <path
                d="M 32 16 C 31 13, 33 11, 35 12 C 36 14, 34 16, 32 16"
                fill="var(--app-a-wash-sage-text, #2D583B)"
                opacity="0.9"
              />
            </g>
          )}

          {medallionType === "stones" && (
            <g>
              <circle cx="30" cy="30" r="28" fill="url(#medallion-lavender-grad)" />
              <circle cx="30" cy="30" r="27.5" stroke="var(--app-a-wash-lavender-border, #9A8EC2)" strokeWidth="1" strokeOpacity="0.4" />
              {/* 3 Zen balanced stones */}
              {/* Base stone (largest) */}
              <ellipse
                cx="30"
                cy="41"
                rx="15"
                ry="6.5"
                fill="var(--app-a-wash-lavender-text, #503E78)"
                opacity="0.82"
              />
              {/* Middle stone */}
              <ellipse
                cx="30"
                cy="31"
                rx="11.5"
                ry="5.5"
                fill="var(--app-a-wash-lavender-text, #503E78)"
                opacity="0.9"
              />
              {/* Top stone (zen pebble) */}
              <ellipse
                cx="30"
                cy="22"
                rx="8"
                ry="4.5"
                fill="var(--app-a-wash-lavender-text, #503E78)"
                opacity="0.95"
              />
            </g>
          )}

          {medallionType === "waves" && (
            <g>
              <circle cx="30" cy="30" r="28" fill="url(#medallion-blue-grad)" />
              <circle cx="30" cy="30" r="27.5" stroke="var(--app-a-wash-dusty-blue-border, #527FA4)" strokeWidth="1" strokeOpacity="0.4" />
              {/* Serene water wave lines */}
              <path
                d="M 12 28 C 18 24, 24 32, 30 28 C 36 24, 42 32, 48 28"
                stroke="var(--app-a-wash-dusty-blue-text, #2D5270)"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 14 36 C 20 32, 26 40, 32 36 C 38 32, 44 40, 47 37"
                stroke="var(--app-a-wash-dusty-blue-text, #2D5270)"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
                opacity="0.8"
              />
            </g>
          )}

          {medallionType === "dots" && (
            <g>
              <circle cx="30" cy="30" r="28" fill="url(#medallion-sage-grad)" />
              <circle cx="30" cy="30" r="27.5" stroke="var(--app-a-wash-sage-border, #679476)" strokeWidth="1" strokeOpacity="0.4" />
              <circle cx="21" cy="31" r="4.5" fill="var(--app-a-wash-sage-text, #2D583B)" opacity="0.8" />
              <circle cx="30" cy="27" r="5" fill="var(--app-a-wash-sage-text, #2D583B)" opacity="0.9" />
              <circle cx="39" cy="33" r="4" fill="var(--app-a-wash-sage-text, #2D583B)" opacity="0.8" />
            </g>
          )}

          {medallionType === "sun" && (
            <g>
              <circle cx="30" cy="30" r="28" fill="url(#medallion-apricot-grad)" />
              <circle cx="30" cy="30" r="27.5" stroke="var(--app-a-wash-apricot-border, #DC8258)" strokeWidth="1" strokeOpacity="0.4" />
              {/* Semi-sun on horizon */}
              <path d="M 16 38 L 44 38" stroke="var(--app-a-wash-apricot-text, #8E4420)" strokeWidth="1.5" strokeLinecap="round" />
              <path
                d="M 22 38 A 8 8 0 0 1 38 38 Z"
                fill="var(--app-a-warning, #D9822B)"
              />
            </g>
          )}
        </svg>
      </div>
    );
  }

  if (variant === "loading") {
    // Full vertical journey for DailyResetLoadingState:
    // scattered shapes -> blue landscape -> orange plant -> lavender stones -> horizon sunrise!
    return (
      <div className={`relative flex items-center justify-center select-none ${className}`} aria-hidden={ariaHidden}>
        <svg
          viewBox="0 0 280 340"
          className="w-[240px] sm:w-[280px] h-[290px] sm:h-[340px] drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flow-sun-glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFA666" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FF7A38" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="flow-mountain-back" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9BB5CA" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#C4B8D8" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="flow-mountain-front" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7E9EB8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#5E83A2" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="flow-plant-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEDEC8" />
              <stop offset="100%" stopColor="#F9C3A0" />
            </linearGradient>
            <linearGradient id="flow-stone-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E9E2F7" />
              <stop offset="100%" stopColor="#D2C5EC" />
            </linearGradient>
            <linearGradient id="flow-blue-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D9ECF9" />
              <stop offset="100%" stopColor="#BEDDF2" />
            </linearGradient>
          </defs>

          {/* 0. Connecting Winding Path (rasuti oblici -> plavi pejzaž -> biljka -> kamenje -> horizont) */}
          <path
            d="M 52 300 C 65 270, 70 250, 95 240 C 130 225, 145 190, 140 160 C 135 130, 160 100, 195 85 C 215 75, 225 55, 230 45"
            stroke="var(--app-a-accent, #527FA4)"
            strokeWidth="2.2"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
            fill="none"
          />

          {/* 1. Rasuti apstraktni oblici (bottom left) */}
          <g className="opacity-90">
            {/* Peach organic blob */}
            <path
              d="M 40 315 C 32 305, 42 290, 52 295 C 62 300, 58 318, 48 322 C 42 324, 35 320, 40 315 Z"
              fill="#F9C6A5"
              opacity="0.75"
            />
            {/* Soft sage droplet */}
            <path
              d="M 68 285 C 64 278, 72 270, 78 274 C 84 278, 80 290, 74 291 C 70 292, 66 289, 68 285 Z"
              fill="#BCDABE"
              opacity="0.8"
            />
            {/* Lavender pebble */}
            <circle cx="36" cy="285" r="7" fill="#D7CCE9" opacity="0.75" />
            {/* Dusty blue splash */}
            <ellipse cx="60" cy="316" rx="5" ry="3.5" fill="#B9D7EC" opacity="0.85" />
          </g>

          {/* 2. Plavi pejzaž (Blue landscape circle) at (95, 235) */}
          <g transform="translate(95, 235)">
            <circle cx="0" cy="0" r="26" fill="url(#flow-blue-bg)" />
            <circle cx="0" cy="0" r="25.5" stroke="#7BA6C7" strokeWidth="1" strokeOpacity="0.4" />
            {/* Wave arcs */}
            <path
              d="M -16 -2 C -10 -6, -4 2, 2 -2 C 8 -6, 14 2, 16 -1"
              stroke="#2D5270"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M -13 6 C -8 3, -3 9, 2 6 C 7 3, 11 8, 14 6"
              stroke="#2D5270"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
          </g>

          {/* 3. Narandžasti krug sa biljkom (Orange circle with botanical plant) at (140, 155) */}
          <g transform="translate(140, 155)">
            <circle cx="0" cy="0" r="28" fill="url(#flow-plant-bg)" />
            <circle cx="0" cy="0" r="27.5" stroke="#DC8258" strokeWidth="1" strokeOpacity="0.45" />
            {/* Plant stem */}
            <path
              d="M 0 16 C 0 8, -1 -3, 3 -13"
              stroke="#8E4420"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Sage botanical leaves */}
            <path
              d="M 0 7 C -6 5, -10 1, -9 -3 C -6 -3, -2 1, 0 5"
              fill="#2D583B"
              opacity="0.9"
            />
            <path
              d="M 1 0 C 7 -2, 11 -6, 10 -10 C 7 -10, 3 -6, 1 -2"
              fill="#2D583B"
              opacity="0.9"
            />
            <path
              d="M 2 -8 C -3 -10, -6 -14, -5 -17 C -2 -17, 1 -13, 2 -10"
              fill="#2D583B"
              opacity="0.9"
            />
            <path
              d="M 3 -14 C 2 -17, 4 -19, 6 -18 C 7 -16, 5 -14, 3 -14"
              fill="#2D583B"
              opacity="0.9"
            />
          </g>

          {/* 4. Lavanda krug sa kamenjem (Lavender circle with 3 stones) at (195, 82) */}
          <g transform="translate(195, 82)">
            <circle cx="0" cy="0" r="26" fill="url(#flow-stone-bg)" />
            <circle cx="0" cy="0" r="25.5" stroke="#9A8EC2" strokeWidth="1" strokeOpacity="0.45" />
            {/* 3 Zen balanced stones */}
            <ellipse cx="0" cy="11" rx="14" ry="5.5" fill="#4B3D6E" opacity="0.82" />
            <ellipse cx="0" cy="2" rx="10.5" ry="4.5" fill="#4B3D6E" opacity="0.9" />
            <ellipse cx="0" cy="-6" rx="7" ry="3.5" fill="#4B3D6E" opacity="0.96" />
          </g>

          {/* 5. Miran horizont i izlazak sunca (Calm horizon & sunrise at top right) */}
          <g transform="translate(190, 12)">
            {/* Mountain backdrop */}
            <path
              d="M -10 32 Q 15 16, 40 24 Q 60 14, 85 32 Z"
              fill="url(#flow-mountain-back)"
            />
            {/* Glowing Sun on Horizon */}
            <circle cx="38" cy="26" r="16" fill="url(#flow-sun-glow)" opacity="0.95" />
            {/* Mountain foreground */}
            <path
              d="M 5 34 Q 30 22, 55 30 Q 75 25, 90 34 Z"
              fill="url(#flow-mountain-front)"
            />
            {/* Water horizon line */}
            <line x1="-15" y1="34" x2="95" y2="34" stroke="#527FA4" strokeWidth="1.5" strokeOpacity="0.8" />
            {/* Water reflection ripples */}
            <line x1="24" y1="37" x2="52" y2="37" stroke="#FFA666" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.75" />
            <line x1="28" y1="40" x2="48" y2="40" stroke="#FFA666" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
            <line x1="32" y1="43" x2="44" y2="43" stroke="#FFA666" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.45" />
          </g>
        </svg>
      </div>
    );
  }

  // variant === "header" (Default safe-zoned header motif on top-right)
  return (
    <div
      className={`app-a-growth-motif pointer-events-none select-none ${className}`}
      aria-hidden={ariaHidden}
    >
      <svg
        viewBox="0 0 180 120"
        className="w-full h-full"
        preserveAspectRatio="xMaxYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hdr-sun-glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFA461" />
            <stop offset="100%" stopColor="#FF7630" />
          </linearGradient>
          <linearGradient id="hdr-mountain-back" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9BB5CA" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C4B8D8" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="hdr-mountain-front" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7E9EB8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#5E83A2" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="hdr-plant-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEDEC8" />
            <stop offset="100%" stopColor="#F9C3A0" />
          </linearGradient>
          <linearGradient id="hdr-stone-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E9E2F7" />
            <stop offset="100%" stopColor="#D2C5EC" />
          </linearGradient>
          <linearGradient id="hdr-blue-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D9ECF9" />
            <stop offset="100%" stopColor="#BEDDF2" />
          </linearGradient>
        </defs>

        {/* Connecting gentle dotted trail */}
        <path
          d="M 12 110 C 25 95, 45 90, 68 76 C 90 64, 110 46, 135 34"
          stroke="var(--app-a-accent, #527FA4)"
          strokeWidth="1.8"
          strokeDasharray="3.5 3.5"
          strokeOpacity="0.4"
          fill="none"
        />

        {/* Scattered soft droplets bottom-left */}
        <path
          d="M 10 112 C 6 106, 12 98, 18 102 C 22 105, 20 114, 14 116 Z"
          fill="#F9C6A5"
          opacity="0.65"
        />
        <circle cx="28" cy="98" r="4.5" fill="#BCDABE" opacity="0.75" />

        {/* 1. Plavi krug sa talasima (Blue wave circle) at (62, 78) */}
        <g transform="translate(62, 78)">
          <circle cx="0" cy="0" r="16" fill="url(#hdr-blue-bg)" />
          <circle cx="0" cy="0" r="15.5" stroke="#7BA6C7" strokeWidth="0.8" strokeOpacity="0.4" />
          <path
            d="M -9 -1 C -5 -4, -1 2, 3 -1 C 7 -4, 10 1, 11 -1"
            stroke="#2D5270"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* 2. Narandžasti krug sa biljkom (Plant circle) at (102, 54) */}
        <g transform="translate(102, 54)">
          <circle cx="0" cy="0" r="18" fill="url(#hdr-plant-bg)" />
          <circle cx="0" cy="0" r="17.5" stroke="#DC8258" strokeWidth="0.8" strokeOpacity="0.45" />
          <path
            d="M 0 11 C 0 5, -1 -2, 2 -9"
            stroke="#8E4420"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 0 4 C -4 3, -7 0, -6 -3 C -4 -3, -1 0, 0 3"
            fill="#2D583B"
            opacity="0.9"
          />
          <path
            d="M 1 -1 C 5 -2, 8 -5, 7 -8 C 5 -8, 2 -5, 1 -2"
            fill="#2D583B"
            opacity="0.9"
          />
        </g>

        {/* 3. Lavanda krug sa kamenjem (Stones circle) at (142, 38) */}
        <g transform="translate(142, 38)">
          <circle cx="0" cy="0" r="16" fill="url(#hdr-stone-bg)" />
          <circle cx="0" cy="0" r="15.5" stroke="#9A8EC2" strokeWidth="0.8" strokeOpacity="0.45" />
          <ellipse cx="0" cy="7" rx="8.5" ry="3.5" fill="#4B3D6E" opacity="0.85" />
          <ellipse cx="0" cy="1" rx="6.5" ry="2.8" fill="#4B3D6E" opacity="0.9" />
          <ellipse cx="0" cy="-4" rx="4.5" ry="2.2" fill="#4B3D6E" opacity="0.96" />
        </g>

        {/* 4. Miran horizont i izlazak sunca (Horizon & Sunrise at top right) */}
        <g transform="translate(130, 4)">
          {/* Mountains */}
          <path
            d="M -15 22 Q 5 10, 25 16 Q 40 9, 52 22 Z"
            fill="url(#hdr-mountain-back)"
          />
          {/* Sun */}
          <circle cx="22" cy="17" r="11" fill="url(#hdr-sun-glow)" opacity="0.95" />
          {/* Mountain front */}
          <path
            d="M -5 23 Q 15 14, 34 20 Q 46 17, 54 23 Z"
            fill="url(#hdr-mountain-front)"
          />
          {/* Horizon Line */}
          <line x1="-15" y1="23" x2="55" y2="23" stroke="#527FA4" strokeWidth="1.2" strokeOpacity="0.75" />
          {/* Water reflection ripples */}
          <line x1="12" y1="25.5" x2="32" y2="25.5" stroke="#FFA461" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.75" />
          <line x1="16" y1="28" x2="28" y2="28" stroke="#FFA461" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.55" />
        </g>
      </svg>
    </div>
  );
}
