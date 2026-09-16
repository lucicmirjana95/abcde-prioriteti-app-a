import { motion } from "motion/react";

interface CompanionVisualProps {
  level: number;
  mood: "sleeping" | "happy" | "excited" | "sad" | "neutral";
  size?: number;
}

export default function CompanionVisual({
  level,
  mood,
  size = 120
}: CompanionVisualProps) {
  const lvl = Number(level) || 1;
  let stage = 0;
  if (lvl >= 10) stage = 1;
  if (lvl >= 30) stage = 2;
  if (lvl >= 60) stage = 3;
  if (lvl >= 100) stage = 4;

  const bounceAnim = {
    y: [0, -10, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const idleAnim = {
    y: [0, -4, 0],
    scale: [1, 1.02, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const sleepAnim = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const wrapperProps = mood === "sleeping" ? sleepAnim : mood === "excited" ? bounceAnim : idleAnim;

  const bodyColors = [
    "#E0B0FF", // 0: Egg (Distinct Mauve/Purple)
    "#D8BFD8", // 1: Baby (Thistle Purple)
    "#DA70D6", // 2: Teen (Orchid Purple)
    "#BA55D3", // 3: Adult (Medium Orchid)
    "#9932CC"  // 4: Mythical (Dark Orchid)
  ];

  const color3 = bodyColors[stage] || bodyColors[0];

  return (
    <motion.div
      animate={wrapperProps as any}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <radialGradient id="lumiMagicalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#CE93D8" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#BA55D3" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9932CC" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="eggGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3E5F5" />
            <stop offset="50%" stopColor="#E0B0FF" />
            <stop offset="100%" stopColor="#CE93D8" />
          </linearGradient>
        </defs>

        {stage === 0 && (
          <g id="lumi-egg">
            <circle cx="50" cy="55" r="45" fill="url(#lumiMagicalGlow)" />
            <ellipse
              cx="50"
              cy="55"
              rx="34"
              ry="40"
              fill="url(#eggGradient)"
              stroke="#4A148C"
              strokeWidth="3"
            />
            <circle
              cx="38"
              cy="42"
              r="3"
              fill="#FFD700"
              opacity="0.9"
              stroke="#4A148C"
              strokeWidth="0.5"
            />
            <circle
              cx="62"
              cy="70"
              r="2.5"
              fill="#FFD700"
              opacity="0.9"
              stroke="#4A148C"
              strokeWidth="0.5"
            />
            <circle
              cx="32"
              cy="65"
              r="2"
              fill="#FFD700"
              opacity="0.9"
              stroke="#4A148C"
              strokeWidth="0.5"
            />
            <circle
              cx="60"
              cy="40"
              r="3.5"
              fill="#FFD700"
              opacity="0.9"
              stroke="#4A148C"
              strokeWidth="0.5"
            />
            <path
              d="M 22 55 Q 50 35 78 55"
              stroke="#4A148C"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              d="M 18 63 Q 50 48 82 63"
              stroke="#4A148C"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.4"
            />
            <ellipse
              cx="40"
              cy="35"
              rx="6"
              ry="10"
              transform="rotate(-15, 40, 35)"
              fill="#FFFFFF"
              opacity="0.6"
            />
            {lvl > 5 && (
              <path
                d="M 45 15 L 50 25 L 43 32 L 48 40"
                stroke="#4A148C"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {stage === 1 && (
          <g id="lumi-baby">
            <circle cx="50" cy="55" r="45" fill="url(#lumiMagicalGlow)" />
            <circle
              cx="50"
              cy="55"
              r="35"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="3"
            />
            <circle cx="32" cy="58" r="4" fill="#FF80AB" opacity="0.6" />
            <circle cx="68" cy="58" r="4" fill="#FF80AB" opacity="0.6" />
            {mood === "sleeping" ? (
              <>
                <path
                  d="M 35 50 Q 40 55 45 50"
                  stroke="#4A148C"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 55 50 Q 60 55 65 50"
                  stroke="#4A148C"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <circle cx="40" cy="50" r="5" fill="#4A148C" />
                <circle cx="60" cy="50" r="5" fill="#4A148C" />
              </>
            )}
            {mood === "happy" || mood === "excited" ? (
              <path
                d="M 45 60 Q 50 65 55 60"
                stroke="#4A148C"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : mood === "sad" ? (
              <path
                d="M 45 65 Q 50 60 55 65"
                stroke="#4A148C"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <line
                x1="47"
                y1="62"
                x2="53"
                y2="62"
                stroke="#4A148C"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {stage === 2 && (
          <g id="lumi-teen">
            <path
              d="M 20 40 Q 10 20 25 30"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="2"
            />
            <path
              d="M 80 40 Q 90 20 75 30"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="2"
            />
            <ellipse
              cx="50"
              cy="50"
              rx="35"
              ry="40"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="3"
            />
            {mood === "sleeping" ? (
              <>
                <path
                  d="M 35 45 Q 40 50 45 45"
                  stroke="#4A148C"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 55 45 Q 60 50 65 45"
                  stroke="#4A148C"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <circle cx="38" cy="45" r="6" fill="#4A148C" />
                <circle cx="62" cy="45" r="6" fill="#4A148C" />
                <circle cx="40" cy="43" r="2" fill="#fff" />
                <circle cx="64" cy="43" r="2" fill="#fff" />
              </>
            )}
            {mood === "happy" || mood === "excited" ? (
              <path
                d="M 45 55 Q 50 62 55 55"
                stroke="#4A148C"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : mood === "sad" ? (
              <path
                d="M 45 60 Q 50 55 55 60"
                stroke="#4A148C"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <line
                x1="47"
                y1="58"
                x2="53"
                y2="58"
                stroke="#4A148C"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {stage === 3 && (
          <g id="lumi-adult">
            <path
              d="M 15 50 Q 5 10 30 25"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="2"
            />
            <path
              d="M 85 50 Q 95 10 70 25"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="2"
            />
            <ellipse
              cx="50"
              cy="55"
              rx="40"
              ry="45"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="3"
            />
            <ellipse
              cx="50"
              cy="65"
              rx="25"
              ry="20"
              fill="#fff"
              opacity="0.3"
            />
            {mood === "sleeping" ? (
              <>
                <path
                  d="M 35 45 Q 40 50 45 45"
                  stroke="#4A148C"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 55 45 Q 60 50 65 45"
                  stroke="#4A148C"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <circle cx="35" cy="45" r="7" fill="#4A148C" />
                <circle cx="65" cy="45" r="7" fill="#4A148C" />
                <circle cx="37" cy="43" r="2.5" fill="#fff" />
                <circle cx="67" cy="43" r="2.5" fill="#fff" />
              </>
            )}
            {mood === "happy" || mood === "excited" ? (
              <path
                d="M 43 55 Q 50 65 57 55"
                stroke="#4A148C"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : mood === "sad" ? (
              <path
                d="M 43 60 Q 50 55 57 60"
                stroke="#4A148C"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M 47 55 Q 50 58 53 55"
                stroke="#4A148C"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {stage === 4 && (
          <g id="lumi-mythical">
            <path
              d="M 35 15 L 42 25 L 50 10 L 58 25 L 65 15 L 60 30 L 40 30 Z"
              fill="#FFD700"
              stroke="#4A148C"
              strokeWidth="2"
            />
            <path
              d="M 5 50 Q -10 20 25 30"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="2"
            />
            <path
              d="M 95 50 Q 110 20 75 30"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="2"
            />
            <ellipse
              cx="50"
              cy="55"
              rx="45"
              ry="50"
              fill={color3}
              stroke="#4A148C"
              strokeWidth="3"
            />
            <ellipse
              cx="50"
              cy="65"
              rx="30"
              ry="25"
              fill="#fff"
              opacity="0.4"
            />
            {mood === "sleeping" ? (
              <>
                <path
                  d="M 30 45 Q 40 50 45 45"
                  stroke="#4A148C"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 55 45 Q 60 50 70 45"
                  stroke="#4A148C"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <circle cx="32" cy="45" r="8" fill="#4A148C" />
                <circle cx="68" cy="45" r="8" fill="#4A148C" />
                <circle cx="35" cy="42" r="3" fill="#fff" />
                <circle cx="71" cy="42" r="3" fill="#fff" />
              </>
            )}
            {mood === "happy" || mood === "excited" ? (
              <path
                d="M 40 55 Q 50 68 60 55"
                stroke="#4A148C"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            ) : mood === "sad" ? (
              <path
                d="M 40 65 Q 50 55 60 65"
                stroke="#4A148C"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M 45 58 Q 50 62 55 58"
                stroke="#4A148C"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            )}
            <circle cx="20" cy="55" r="5" fill="#FF4081" opacity="0.5" />
            <circle cx="80" cy="55" r="5" fill="#FF4081" opacity="0.5" />
          </g>
        )}
      </svg>
    </motion.div>
  );
}
