import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const PROFILE_COMPLETION_KEY = "hivespell.profile_completion_step";

export { PROFILE_COMPLETION_KEY };

export type ProfileCompletionStep =
  | "username"
  | "avatar"
  | "theme"
  | "cursor"
  | "complete";

export interface ProfileCompletionState {
  currentStep: ProfileCompletionStep;
  isActive: boolean;
  hasCompleted: boolean;
  stepIndex: number;
  completedSteps: ProfileCompletionStep[];
}

const PROFILE_STEPS: ProfileCompletionStep[] = [
  "username",
  "avatar",
  "theme",
  "cursor",
  "complete",
];

const STEP_REWARDS: Record<
  Exclude<ProfileCompletionStep, "complete">,
  { nectar: number; description: string }
> = {
  username: { nectar: 50, description: "Set your username" },
  avatar: { nectar: 25, description: "Choose your avatar" },
  theme: { nectar: 25, description: "Pick a theme" },
  cursor: { nectar: 25, description: "Select a cursor" },
};

const STEP_INFO: Record<
  ProfileCompletionStep,
  { title: string; description: string; reward?: string }
> = {
  username: {
    title: "Choose Your Hive Name",
    description:
      "This is how other spellers will see you in the arena. Make it memorable!",
    reward: "+50 Nectar",
  },
  avatar: {
    title: "Pick Your Avatar",
    description: "Choose a look that represents your spelling style.",
    reward: "+25 Nectar",
  },
  theme: {
    title: "Select Your Theme",
    description:
      "Customize the arena's atmosphere. Each theme has unique visual effects.",
    reward: "+25 Nectar",
  },
  cursor: {
    title: "Choose Your Cursor",
    description: "Your cursor leaves a trail. Pick one that matches your vibe.",
    reward: "+25 Nectar",
  },
  complete: {
    title: "Profile Complete! 🎉",
    description:
      "You've earned 125 Nectar total! Your profile is ready for the arena.",
    reward: "Total: +125 Nectar",
  },
};

const AVATAR_OPTIONS = [
  { id: "bee", label: "🐝 Worker", emoji: "🐝" },
  { id: "queen", label: "👑 Queen", emoji: "👑" },
  { id: "drone", label: "🤖 Drone", emoji: "🤖" },
  { id: "honey", label: "🍯 Honey", emoji: "🍯" },
  { id: "flower", label: "🌸 Flower", emoji: "🌸" },
  { id: "hex", label: "⬡ Hex", emoji: "⬡" },
];

import { THEME_PACKAGES } from "@/data/themePackages";

/**
 * Hook for managing progressive profile completion with rewards
 */
export function useProfileCompletion() {
  const { userData, refreshUser } = useAuth();
  const [state, setState] = useState<ProfileCompletionState>({
    currentStep: "username",
    isActive: false,
    hasCompleted: false,
    stepIndex: 0,
    completedSteps: [],
  });

  // Check if profile completion should start
  useEffect(() => {
    if (!userData) return;

    const isNewUser =
      userData.corrects === 0 &&
      userData.wins === 0 &&
      userData.title === "Newbee" &&
      !userData.username?.includes("Player");

    const savedStep = localStorage.getItem(PROFILE_COMPLETION_KEY) as
      | ProfileCompletionStep
      | null;
    const completed = localStorage.getItem(PROFILE_COMPLETION_KEY + "_done") === "true";

    if (isNewUser && !completed) {
      const startStep = savedStep || "username";
      const stepIndex = PROFILE_STEPS.indexOf(startStep);
      setState((prev) => ({
        ...prev,
        isActive: true,
        currentStep: startStep,
        stepIndex: Math.max(0, stepIndex),
      }));
    } else {
      setState((prev) => ({ ...prev, hasCompleted: true }));
    }
  }, [userData]);

  const nextStep = useCallback(async () => {
    setState((prev) => {
      const currentStep = prev.currentStep;
      const currentIndex = PROFILE_STEPS.indexOf(currentStep);

      // Mark current step as completed
      const newCompletedSteps = [...prev.completedSteps, currentStep];

      // Check if we're at the last real step
      if (currentStep === "cursor") {
        // Move to complete step
        return {
          ...prev,
          stepIndex: currentIndex + 1,
          currentStep: "complete",
          completedSteps: newCompletedSteps,
        };
      }

      const nextIndex = Math.min(currentIndex + 1, PROFILE_STEPS.length - 1);
      return {
        ...prev,
        stepIndex: nextIndex,
        currentStep: PROFILE_STEPS[nextIndex],
        completedSteps: newCompletedSteps,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = PROFILE_STEPS.indexOf(prev.currentStep);
      if (currentIndex <= 0) return prev;

      const newCompletedSteps = prev.completedSteps.filter(
        (s) => s !== prev.currentStep
      );

      return {
        ...prev,
        stepIndex: currentIndex - 1,
        currentStep: PROFILE_STEPS[currentIndex - 1],
        completedSteps: newCompletedSteps,
      };
    });
  }, []);

  const completeProfile = useCallback(async () => {
    localStorage.setItem(PROFILE_COMPLETION_KEY + "_done", "true");
    localStorage.removeItem(PROFILE_COMPLETION_KEY);
    await refreshUser();
    setState((prev) => ({
      ...prev,
      isActive: false,
      hasCompleted: true,
    }));
  }, [refreshUser]);

  const getCurrentStepInfo = useCallback(() => {
    return STEP_INFO[state.currentStep];
  }, [state.currentStep]);

  const getStepReward = useCallback(
    (step: Exclude<ProfileCompletionStep, "complete">) => {
      return STEP_REWARDS[step];
    },
    []
  );

  const getProgress = useCallback(() => {
    return ((state.stepIndex + 1) / PROFILE_STEPS.length) * 100;
  }, [state.stepIndex]);

  const isStepCompleted = useCallback(
    (step: ProfileCompletionStep) => {
      return state.completedSteps.includes(step);
    },
    [state.completedSteps]
  );

  return {
    ...state,
    nextStep,
    prevStep,
    completeProfile,
    getCurrentStepInfo,
    getStepReward,
    getProgress,
    totalSteps: PROFILE_STEPS.length,
    isStepCompleted,
    avatarOptions: AVATAR_OPTIONS,
    themeOptions: THEME_PACKAGES,
  };
}

/**
 * Reset profile completion for testing
 */
export function resetProfileCompletion() {
  localStorage.removeItem(PROFILE_COMPLETION_KEY);
  localStorage.removeItem(PROFILE_COMPLETION_KEY + "_done");
}