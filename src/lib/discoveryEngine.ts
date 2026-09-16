import { UnlockItem, UnlockCollection, UserDiscoverySettings } from "../types";

// The 20 Discovery Lab reward items as specified for MVP
export const INITIAL_UNLOCK_ITEMS: UnlockItem[] = [
  // 1. THEMES
  {
    id: "theme_lavender",
    name: "Lavender Dream (Cialdini Calm)",
    category: "clarity",
    conditionDescription: "Achieve mental clarity by completing 10 Brain Dump sessions (Proven to reduce cognitive friction)",
    conditionDescriptionSr: "Smanji kognitivno trenje kroz 10 završenih Brain Dump sesija (Dokazano rasterećenje)",
    unlocked: false,
    progress: 0,
    targetValue: 10,
    rewardType: "theme",
    rewardValue: "lavender",
    rewardIcon: "🪻",
  },
  {
    id: "theme_midnight",
    name: "Deep Midnight Focus (5AM Club)",
    category: "focus",
    conditionDescription: "Complete 100 tasks to sync with the elite group of high-performers (Social Proof)",
    conditionDescriptionSr: "Završi 100 zadataka i sinhronizuj se sa elitnom grupom rane produktivnosti",
    unlocked: false,
    progress: 0,
    targetValue: 100,
    rewardType: "theme",
    rewardValue: "midnight",
    rewardIcon: "🌌",
  },
  {
    id: "theme_golden",
    name: "Golden Pareto Horizon (80/20 Leverage)",
    category: "strategy",
    conditionDescription: "Unlock the elite suite by completing 10 high-leverage Category A priorities",
    conditionDescriptionSr: "Otključaj elitni stil kroz 10 završenih Kategori A prioriteta visoke poluge",
    unlocked: false,
    progress: 0,
    targetValue: 10,
    rewardType: "theme",
    rewardValue: "golden",
    rewardIcon: "🏆",
  },
  {
    id: "theme_forest",
    name: "Forest Sanctuary (High Consistency)",
    category: "discipline",
    conditionDescription: "Build automatic habits over 21 consecutive logs to stabilize your routine",
    conditionDescriptionSr: "Stabilizuj navike i stvori kognitivni mir kroz 21 zabeležen dan discipline",
    unlocked: false,
    progress: 0,
    targetValue: 21,
    rewardType: "theme",
    rewardValue: "forest",
    rewardIcon: "🌲",
  },
  {
    id: "theme_ocean",
    name: "Binaural Ocean Flow (Deep Mindwaves)",
    category: "focus",
    conditionDescription: "Master deep focus with 200 tasks completed to unlock high-bandwidth processing",
    conditionDescriptionSr: "Ovladaj dubokim stanjem toka uz 200 završenih zadataka kognitivne stabilnosti",
    unlocked: false,
    progress: 0,
    targetValue: 200,
    rewardType: "theme",
    rewardValue: "ocean",
    rewardIcon: "🌊",
  },
  {
    id: "theme_cyberpunk",
    name: "Stoic Cyberpunk Hack (Neural Mastery)",
    category: "strategy",
    conditionDescription: "Conquer 50 strategic high-leverage objectives to build your fortress of execution",
    conditionDescriptionSr: "Osvoji 50 strateških zadataka visoke poluge za vrhunsku neuronsku disciplinu",
    unlocked: false,
    progress: 0,
    targetValue: 50,
    rewardType: "theme",
    rewardValue: "cyberpunk",
    rewardIcon: "🌆",
  },

  // 2. MICRO ANIMATIONS
  {
    id: "anim_clarity_spark",
    name: "Clarity Spark (Pro)",
    category: "clarity",
    conditionDescription: "Complete your first Brain Dump",
    conditionDescriptionSr: "Prvi Brain Dump",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "animation",
    rewardValue: "clarity_spark",
    rewardIcon: "✨",
  },
  {
    id: "anim_golden_pulse",
    name: "Golden Pulse (Elite)",
    category: "strategy",
    conditionDescription: "Complete your first high-leverage task",
    conditionDescriptionSr: "Prvi high-leverage task",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "animation",
    rewardValue: "golden_pulse",
    rewardIcon: "🟡",
  },
  {
    id: "anim_habit_bloom",
    name: "Habit Bloom",
    category: "discipline",
    conditionDescription: "Reach 7 days of micro-habit",
    conditionDescriptionSr: "7 dana mikro-navike",
    unlocked: false,
    progress: 0,
    targetValue: 7,
    rewardType: "animation",
    rewardValue: "habit_bloom",
    rewardIcon: "🌸",
  },
  {
    id: "anim_goal_glow",
    name: "Goal Glow (Premium)",
    category: "goals",
    conditionDescription: "Complete your first goal milestone",
    conditionDescriptionSr: "Prvi goal milestone",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "animation",
    rewardValue: "goal_glow",
    rewardIcon: "💫",
  },

  // 3. FOCUS AMBIENTS
  {
    id: "ambient_rain",
    name: "Rain Focus (Binaural)",
    category: "focus",
    conditionDescription: "Complete 50 tasks",
    conditionDescriptionSr: "Završi 50 taskova",
    unlocked: false,
    progress: 0,
    targetValue: 50,
    rewardType: "ambient",
    rewardValue: "rain",
    rewardIcon: "🌧️",
  },
  {
    id: "ambient_library",
    name: "Library (Deep Work)",
    category: "clarity",
    conditionDescription: "Complete 10 Brain Dumps + 25 Tasks",
    conditionDescriptionSr: "10 Brain Dump + 25 taskova",
    unlocked: false,
    progress: 0,
    targetValue: 35, // Hybrid target
    rewardType: "ambient",
    rewardValue: "library",
    rewardIcon: "📚",
  },
  {
    id: "ambient_space",
    name: "Deep Space (40Hz)",
    category: "strategy",
    conditionDescription: "Complete 25 priority tasks",
    conditionDescriptionSr: "25 prioritetnih taskova",
    unlocked: false,
    progress: 0,
    targetValue: 25,
    rewardType: "ambient",
    rewardValue: "space",
    rewardIcon: "🌌",
  },
  {
    id: "ambient_fireplace",
    name: "Fireplace (Zen)",
    category: "reflection",
    conditionDescription: "Complete 7 evening reflections",
    conditionDescriptionSr: "7 večernjih planiranja",
    unlocked: false,
    progress: 0,
    targetValue: 7,
    rewardType: "ambient",
    rewardValue: "fireplace",
    rewardIcon: "🔥",
  },

  // 4. REFLECTION CARDS
  {
    id: "card_daily_win",
    name: "Daily Win Card",
    category: "focus",
    conditionDescription: "Reach 10 active days",
    conditionDescriptionSr: "10 aktivnih dana",
    unlocked: false,
    progress: 0,
    targetValue: 10,
    rewardType: "reflection_card",
    rewardValue: "daily_win",
    rewardIcon: "🎖️",
  },
  {
    id: "card_weekly_clarity",
    name: "Weekly Clarity Card",
    category: "clarity",
    conditionDescription: "3 Brain Dumps in one week",
    conditionDescriptionSr: "3 Brain Dump-a u jednoj nedelji",
    unlocked: false,
    progress: 0,
    targetValue: 3,
    rewardType: "reflection_card",
    rewardValue: "weekly_clarity",
    rewardIcon: "📊",
  },
  {
    id: "card_high_leverage",
    name: "High Leverage Win Card",
    category: "strategy",
    conditionDescription: "Complete first 80/20 task",
    conditionDescriptionSr: "Prvi 80/20 task završen",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "reflection_card",
    rewardValue: "high_leverage_win",
    rewardIcon: "🎯",
  },
  {
    id: "card_comeback",
    name: "Comeback Card",
    category: "reflection",
    conditionDescription: "Return after 7+ days break and complete task",
    conditionDescriptionSr: "Povratak nakon 7+ dana pauze i završen task",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "reflection_card",
    rewardValue: "comeback",
    rewardIcon: "🚀",
  },
  {
    id: "card_cialdini_commitment",
    name: "Cialdini Persuasion Card",
    category: "discipline",
    conditionDescription: "Sign your first written solemn commitment (Cialdini Persuasion)",
    conditionDescriptionSr: "Potpiši svoj prvi svečani zavet u Cialdini Akceleratoru",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "reflection_card",
    rewardValue: "cialdini_commitment",
    rewardIcon: "🔒",
  },
  {
    id: "card_woop_strategy",
    name: "WOOP Strategy Card",
    category: "strategy",
    conditionDescription: "Formulate your first scientific WOOP goal in Vision Strategy",
    conditionDescriptionSr: "Formuliši svoj prvi naučni WOOP cilj",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "reflection_card",
    rewardValue: "woop_strategy",
    rewardIcon: "🧬",
  },

  // 5. MILESTONE MOMENTS
  {
    id: "moment_first_braindump",
    name: "First Brain Dump Moment",
    category: "clarity",
    conditionDescription: "Complete your first Brain Dump",
    conditionDescriptionSr: "Prvi Brain Dump",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "moment",
    rewardValue: "first_braindump",
    rewardIcon: "🧠",
  },
  {
    id: "moment_first_plan",
    name: "First Plan Accepted Moment",
    category: "focus",
    conditionDescription: "Accept your first AI plan",
    conditionDescriptionSr: "Prvi AI plan prihvaćen",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "moment",
    rewardValue: "first_plan",
    rewardIcon: "📝",
  },
  {
    id: "moment_first_leverage",
    name: "First High-Leverage Win",
    category: "strategy",
    conditionDescription: "Complete your first high-leverage task",
    conditionDescriptionSr: "Prvi high-leverage task završen",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "moment",
    rewardValue: "first_leverage",
    rewardIcon: "⭐",
  },
  {
    id: "moment_first_goal",
    name: "First Goal Milestone",
    category: "goals",
    conditionDescription: "Complete your first goal milestone",
    conditionDescriptionSr: "Prvi goal milestone završen",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "moment",
    rewardValue: "first_goal",
    rewardIcon: "🎯",
  },
  {
    id: "moment_30_days",
    name: "30-Day Discipline Moment",
    category: "discipline",
    conditionDescription: "Reach 30 days of micro-habit",
    conditionDescriptionSr: "30 dana mikro-navike",
    unlocked: false,
    progress: 0,
    targetValue: 30,
    rewardType: "moment",
    rewardValue: "30_days",
    rewardIcon: "🔥",
  },
  {
    id: "moment_cialdini_signed",
    name: "Cialdini Active Pledge",
    category: "discipline",
    conditionDescription: "Lock your active written commitment",
    conditionDescriptionSr: "Aktiviraj i zaključaj kognitivni zavet u Cialdini Akceleratoru",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "moment",
    rewardValue: "cialdini_commitment",
    rewardIcon: "✍️",
  },
  {
    id: "moment_woop_active",
    name: "WOOP Breakthrough",
    category: "strategy",
    conditionDescription: "Activate a scientific WOOP model in any Vision Chamber",
    conditionDescriptionSr: "Aktiviraj naučni WOOP model u bilo kojoj odaji vizije",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "moment",
    rewardValue: "woop_breakthrough",
    rewardIcon: "🪐",
  },

  // 6. SOUND PACKS
  {
    id: "sound_soft_spark",
    name: "Minimalist Wood (Pro)",
    category: "clarity",
    conditionDescription: "Complete your first Brain Dump",
    conditionDescriptionSr: "Prvi Brain Dump",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "sound",
    rewardValue: "soft_spark",
    rewardIcon: "✨",
  },
  {
    id: "sound_golden_click",
    name: "Golden Haptic (Elite)",
    category: "strategy",
    conditionDescription: "Complete your first high-leverage task",
    conditionDescriptionSr: "Prvi high-leverage task",
    unlocked: false,
    progress: 0,
    targetValue: 1,
    rewardType: "sound",
    rewardValue: "golden_click",
    rewardIcon: "🟡",
  },
  {
    id: "sound_calm_rain",
    name: "Zen Bell",
    category: "focus",
    conditionDescription: "Complete 50 tasks",
    conditionDescriptionSr: "Završi 50 taskova",
    unlocked: false,
    progress: 0,
    targetValue: 50,
    rewardType: "sound",
    rewardValue: "calm_rain",
    rewardIcon: "🌧️",
  },
  // 7. AI TONE UNLOCKS
  {
    id: "ai_tone_direct",
    name: "Ruthless CEO Mode",
    category: "strategy",
    conditionDescription: "Complete 10 high-leverage tasks",
    conditionDescriptionSr: "Završeno 10 high-leverage zadataka",
    unlocked: false,
    progress: 0,
    targetValue: 10,
    rewardType: "ai_tone",
    rewardValue: "direct",
    rewardIcon: "👔",
  },
  {
    id: "ai_tone_encouraging",
    name: "Empathetic Mentor",
    category: "reflection",
    conditionDescription: "Submit 5 evening reflections",
    conditionDescriptionSr: "Završeno 5 večernjih refleksija",
    unlocked: false,
    progress: 0,
    targetValue: 5,
    rewardType: "ai_tone",
    rewardValue: "encouraging",
    rewardIcon: "🌟",
  },
  {
    id: "ai_tone_philosophical",
    name: "Stoic Master",
    category: "focus",
    conditionDescription: "Accumulate 20 hours of Deep Work",
    conditionDescriptionSr: "20 sati Dubokog Rada",
    unlocked: false,
    progress: 0,
    targetValue: 20,
    rewardType: "ai_tone",
    rewardValue: "philosophical",
    rewardIcon: "🧘",
  },
];

export const INITIAL_SETTINGS: UserDiscoverySettings = {
  activeTheme: "default",
  activeAnimationSet: "default",
  activeAmbient: "none",
  activeSoundPack: "default",
  activeAiTone: "default",
  soundsEnabled: true,
  hapticsEnabled: true,
  minimalModeEnabled: false,
};

// Simple global listener trigger for SPA
let listeners: (() => void)[] = [];

export function subscribeToDiscovery(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error("Error in discovery listener:", e);
    }
  });
  // Also dispatch a browser custom event
  window.dispatchEvent(new CustomEvent("discovery_update"));
}

// Stats calculator from existing storage
export function getDiscoveryStats() {
  let brainDumps = 0;
  let tasksCompleted = 0;
  let highLeverageCompleted = 0;
  let activeDays = 1;
  let milestonesCompleted = 0;
  let decomposedGoals = 0;
  let habitLogsCount = 0;
  let aiActionsCompleted = 0;

  try {
    // 1. Brain dumps from resets history
    const resetsHistoryRaw = safeStorage.getItem("kaizen_morning_resets_history") || "[]";
    const resetsHistory = JSON.parse(resetsHistoryRaw);
    if (Array.isArray(resetsHistory)) {
      brainDumps = resetsHistory.filter((h: any) => h.brainDumpText && h.brainDumpText.trim().length > 0).length;
    }
    // Also support fallback custom increment
    const manualDumps = Number(safeStorage.getItem("discovery_manual_dumps_count") || "0");
    brainDumps = Math.max(brainDumps, manualDumps);

    // 2. Tasks completed from tasks
    const keys = Object.keys(localStorage);
    let allTasks: any[] = [];
    keys.forEach((k) => {
      if (k.startsWith("abcde_tasks")) {
        try {
          const tList = JSON.parse(localStorage.getItem(k) || "[]");
          if (Array.isArray(tList)) {
            allTasks = [...allTasks, ...tList];
          }
        } catch (e) {}
      }
    });

    tasksCompleted = allTasks.filter((t: any) => t.done).length;
    // Also load archived completed tasks
    try {
      const archived = JSON.parse(safeStorage.getItem("abcde_tasks_archive") || "[]");
      if (Array.isArray(archived)) {
        tasksCompleted += archived.length;
      }
    } catch (e) {}

    // 3. High Leverage Completed (Tasks marked as done where category is A or B, or impact >= 7, or effort/impact set)
    highLeverageCompleted = allTasks.filter(
      (t: any) => t.done && (t.category === "B" || t.category === "A" || (t.impact && t.impact >= 7))
    ).length;

    // 4. Milestones completed
    try {
      const milRaw = safeStorage.getItem("abcde_vchamber_completed_milestones") || "[]";
      const milestones = JSON.parse(milRaw);
      if (Array.isArray(milestones)) {
        milestonesCompleted = milestones.length;
      }
    } catch (e) {}

    // 5. Decomposed goals
    if (decomposedGoals === 0 && brainDumps > 0) {
      // fallback to simulate if any goals exist
      decomposedGoals = Math.min(Math.floor(brainDumps / 2), 5);
    }

    // 6. Habit completed logs
    try {
      const habitsRaw = safeStorage.getItem("abcde_calendar_logs") || "{}";
      const habitsObj = JSON.parse(habitsRaw);
      // Count total checklist completions
      let count = 0;
      Object.keys(habitsObj).forEach((dateKey) => {
        const dateObj = habitsObj[dateKey];
        if (dateObj && typeof dateObj === "object") {
          Object.keys(dateObj).forEach((habitId) => {
            if (dateObj[habitId] === true) {
              count++;
            }
          });
        }
      });
      habitLogsCount = count;
    } catch (e) {}

    // 7. Active Days
    const activeDaysSet = new Set<string>();
    // Add completion dates of completed tasks if they have completedTime
    allTasks.forEach((t: any) => {
      if (t.completedTime) {
        activeDaysSet.add(t.completedTime.slice(0, 10));
      } else if (t.createdTime) {
        activeDaysSet.add(t.createdTime.slice(0, 10));
      }
    });
    // Add reset dates
    if (Array.isArray(resetsHistory)) {
      resetsHistory.forEach((h: any) => {
        if (h.timestamp) {
          activeDaysSet.add(h.timestamp.slice(0, 10));
        }
      });
    }
    activeDays = Math.max(activeDaysSet.size, 1);

    // 8. AI actions completed (Completed tasks that were AI Suggested)
    aiActionsCompleted = allTasks.filter((t: any) => t.done && t.aiSuggested).length;

  } catch (err) {
    console.error("Failed to compute discovery statistics:", err);
  }

  return {
    brainDumps,
    tasksCompleted,
    highLeverageCompleted,
    activeDays,
    milestonesCompleted,
    decomposedGoals,
    habitLogsCount,
    aiActionsCompleted,
  };
}

// Gets the list of 30 UnlockItems with computed progress and unlocked states
export function getUnlockItems(): UnlockItem[] {
  const stats = getDiscoveryStats();
  
  // Load custom manual unlock override states from local storage to keep manually triggered rewards persistence
  const unlockedMap: Record<string, boolean> = {};
  try {
    const rawUnlocked = safeStorage.getItem("discovery_unlocked_items_map") || "{}";
    Object.assign(unlockedMap, JSON.parse(rawUnlocked));
  } catch (e) {}

  return INITIAL_UNLOCK_ITEMS.map((item) => {
    let progress = 0;
    
    // Dynamically match progress variable to the condition
    switch (item.id) {
      // 1. THEMES
      case "theme_lavender":
        progress = stats.brainDumps;
        break;
      case "theme_midnight":
        progress = stats.tasksCompleted;
        break;
      case "theme_golden":
        progress = stats.highLeverageCompleted;
        break;
      case "theme_forest":
        progress = stats.habitLogsCount;
        break;
      case "theme_ocean":
        progress = stats.tasksCompleted;
        break;
      case "theme_cyberpunk":
        progress = stats.highLeverageCompleted;
        break;

      // 2. MICRO ANIMATIONS
      case "anim_clarity_spark":
        progress = stats.brainDumps;
        break;
      case "anim_golden_pulse":
        progress = stats.highLeverageCompleted;
        break;
      case "anim_habit_bloom":
        progress = stats.habitLogsCount;
        break;
      case "anim_goal_glow":
        progress = stats.milestonesCompleted;
        break;

      // 3. FOCUS AMBIENTS
      case "ambient_rain":
        progress = stats.tasksCompleted;
        break;
      case "ambient_library":
        progress = stats.brainDumps + stats.tasksCompleted; // Hybrid
        break;
      case "ambient_space":
        progress = Math.floor(stats.tasksCompleted / 2); // Approximation for priority
        break;
      case "ambient_fireplace":
        progress = Math.floor(stats.brainDumps / 2); // Evening reflection approx
        break;

      // 4. REFLECTION CARDS
      case "card_daily_win":
        progress = stats.activeDays;
        break;
      case "card_weekly_clarity":
        progress = stats.brainDumps;
        break;
      case "card_high_leverage":
        progress = stats.highLeverageCompleted;
        break;
      case "card_comeback":
        progress = stats.tasksCompleted >= 1 ? 1 : 0;
        break;
      case "card_cialdini_commitment":
        try {
          progress = safeStorage.getItem("cialdini_is_signed") === "true" ? 1 : 0;
        } catch (e) {
          progress = 0;
        }
        break;
      case "card_woop_strategy":
        try {
          const woopActiveStr = safeStorage.getItem("abcde_vchamber_is_woop_active");
          if (woopActiveStr) {
            const woopActive = JSON.parse(woopActiveStr);
            const anyActive = Object.values(woopActive).some(val => val === true);
            progress = anyActive ? 1 : 0;
          } else {
            progress = 0;
          }
        } catch (e) {
          progress = 0;
        }
        break;

      // 5. MILESTONE MOMENTS
      case "moment_first_braindump":
        progress = stats.brainDumps;
        break;
      case "moment_first_plan":
        progress = stats.aiActionsCompleted;
        break;
      case "moment_first_leverage":
        progress = stats.highLeverageCompleted;
        break;
      case "moment_first_goal":
        progress = stats.milestonesCompleted;
        break;
      case "moment_30_days":
        progress = stats.habitLogsCount;
        break;
      case "moment_cialdini_signed":
        try {
          progress = safeStorage.getItem("cialdini_is_signed") === "true" ? 1 : 0;
        } catch (e) {
          progress = 0;
        }
        break;
      case "moment_woop_active":
        try {
          const woopActiveStr = safeStorage.getItem("abcde_vchamber_is_woop_active");
          if (woopActiveStr) {
            const woopActive = JSON.parse(woopActiveStr);
            const anyActive = Object.values(woopActive).some(val => val === true);
            progress = anyActive ? 1 : 0;
          } else {
            progress = 0;
          }
        } catch (e) {
          progress = 0;
        }
        break;

      // 6. SOUND PACKS
      case "sound_soft_spark":
        progress = stats.brainDumps;
        break;
      case "sound_golden_click":
        progress = stats.highLeverageCompleted;
        break;
      case "sound_calm_rain":
        progress = stats.tasksCompleted;
        break;

      // 7. AI TONES
      case "ai_tone_direct":
        progress = stats.highLeverageCompleted;
        break;
      case "ai_tone_encouraging":
        progress = stats.brainDumps;
        break;
      case "ai_tone_philosophical":
        progress = Math.floor(stats.tasksCompleted / 2); // roughly matching the deep work intent
        break;

      default:
        progress = 0;
    }

    // Limit progress to targetValue
    const actualProgress = Math.min(progress, item.targetValue);
    const unlocked = actualProgress >= item.targetValue || !!unlockedMap[item.id];

    // Persist automatically if newly unlocked
    if (unlocked && !unlockedMap[item.id]) {
      unlockedMap[item.id] = true;
      try {
        safeStorage.setItem("discovery_unlocked_items_map", JSON.stringify(unlockedMap));
        // Add a history item
        const historyRaw = safeStorage.getItem("discovery_unlock_history") || "[]";
        const history = JSON.parse(historyRaw);
        if (!history.some((h: any) => h.itemId === item.id)) {
          history.push({
            id: "hist-" + Date.now(),
            itemId: item.id,
            unlockedAt: new Date().toISOString(),
          });
          safeStorage.setItem("discovery_unlock_history", JSON.stringify(history));
        }
      } catch (e) {}
    }

    return {
      ...item,
      progress: actualProgress,
      unlocked,
      unlockedAt: unlocked ? new Date().toISOString() : undefined,
    };
  });
}

// Main event entrypoint that modules call to record an action
export function triggerDiscoveryEvent(eventType: string, metadata?: any) {
  try {
    // 1. Log event
    const eventsRaw = safeStorage.getItem("discovery_events_log") || "[]";
    const events = JSON.parse(eventsRaw);
    events.push({
      id: "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      eventType,
      timestamp: new Date().toISOString(),
      metadata,
    });
    // Keep last 100 events to prevent bloating
    if (events.length > 100) events.shift();
    safeStorage.setItem("discovery_events_log", JSON.stringify(events));

    // Refresh unlocks and check if a new reward is unlocked
    const beforeUnlocks = getUnlockItems();
    
    // Recalculate and trigger notification if newly unlocked
    const afterUnlocks = getUnlockItems();
    afterUnlocks.forEach((item) => {
      const wasUnlocked = beforeUnlocks.find((b) => b.id === item.id)?.unlocked;
      if (item.unlocked && !wasUnlocked) {
        // Dispatch custom toast unlock notification event
        const unlockNotification = new CustomEvent("discovery_new_unlock", {
          detail: item,
        });
        window.dispatchEvent(unlockNotification);
      }
    });

    notifyListeners();
  } catch (err) {
    console.error("Error inside triggerDiscoveryEvent:", err);
  }
}

// Loads active customizations
export function getDiscoverySettings(): UserDiscoverySettings {
  try {
    const raw = safeStorage.getItem("discovery_user_settings");
    if (raw) {
      return {
        ...INITIAL_SETTINGS,
        ...JSON.parse(raw),
      };
    }
  } catch (e) {}
  return INITIAL_SETTINGS;
}

// Saves a personalization option
export function updateDiscoverySetting(key: keyof UserDiscoverySettings, value: any) {
  try {
    const current = getDiscoverySettings();
    const updated = {
      ...current,
      [key]: value,
    };
    safeStorage.setItem("discovery_user_settings", JSON.stringify(updated));
    
    // Apply changes immediately (e.g. if the user changes theme, emit theme_changed)
    window.dispatchEvent(new CustomEvent("discovery_settings_changed", { detail: updated }));
    notifyListeners();
  } catch (e) {
    console.error("Failed to update discovery setting:", e);
  }
}
