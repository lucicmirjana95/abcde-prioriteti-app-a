export interface Task {
  id: string;
  title: string;
  description?: string;
  category: "A" | "B" | "C" | "D" | "E";
  subPriority: number; // 1, 2, 3... within category
  done: boolean;
  createdTime: string;
  reminderTime?: string; // Format: "HH:MM" or datetime string
  deadline?: string; // Optional deadline date string (YYYY-MM-DD)
  delegatedTo?: string; // Optional for category D
  eliminationReason?: string; // Optional for category E
  aiSuggested?: boolean;
  aiExplanation?: string;
  timeRequired?: number; // In minutes
  energyRequired?: string; // Low, Medium, High
  isHabit?: boolean;
  habitId?: string;
  repeat?: "none" | "daily" | "weekly" | "monthly";
  effort?: number; // 1-10 for Pareto 80/20 Leverage
  impact?: number; // 1-10 for Pareto 80/20 Leverage
  ownerId?: string;
  tags?: string[]; // Array of tags for search/filtering
  completedTime?: string; // ISO string when completed
}

export interface AIRasterizedTask {
  title: string;
  description: string;
  category: "A" | "B" | "C" | "D" | "E";
  subPriority: number;
  explanation: string;
  delegatedTo?: string;
  eliminationReason?: string;
  timeRequired?: number;
  energyRequired?: string;
  repeat?: "none" | "daily" | "weekly" | "monthly";
  effort?: number;
  impact?: number;
  isHabit?: boolean;
  habitId?: string;
}

export interface SavedBoard {
  id: string;
  name: string;
  pinCode?: string;
  lastVisited: string;
}

declare global {
  var safeStorage: Storage;
}

export interface UnlockItem {
  id: string;
  name: string;
  category: "clarity" | "focus" | "strategy" | "goals" | "discipline" | "reflection" | "milestone" | "sound" | "animation" | "theme" | "ambient";
  conditionDescription: string;
  conditionDescriptionSr: string;
  unlocked: boolean;
  progress: number;
  targetValue: number;
  unlockedAt?: string;
  rewardType: "theme" | "ai_tone" | "ambient" | "customization" | "visual_accent" | "sound_pack" | "reflection_card" | "animation" | "moment" | "sound";
  rewardValue: string;
  rewardIcon?: string;
}

export interface UnlockCollection {
  id: "clarity" | "focus" | "strategy" | "goals" | "discipline" | "reflection" | "milestone" | "sound" | "animation" | "theme" | "ambient";
  name: string;
  nameSr: string;
  itemsCount: number;
  unlockedCount: number;
}

export interface DiscoveryEvent {
  id: string;
  eventType: string;
  timestamp: string;
  metadata?: any;
}

export interface UnlockHistory {
  id: string;
  itemId: string;
  unlockedAt: string;
}

export interface UserDiscoverySettings {
  activeTheme: string;
  activeAnimationSet: string;
  activeAmbient: string;
  activeSoundPack: string;
  activeAiTone: string;
  soundsEnabled: boolean;
  hapticsEnabled: boolean;
  minimalModeEnabled: boolean;
}

export interface MomentItem {
  id: string;
  title: string;
  text: string;
  sourceEvent: string;
  createdAt: string;
  visualStyle: string;
  shareableImageUrl?: string;
}

