import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const TUTORIAL_COMPLETED_KEY = "hivespell.tutorial_completed";
const TUTORIAL_STEP_KEY = "hivespell.tutorial_step";

export type TutorialStep =
  | "welcome"
  | "listen"
  | "type"
  | "submit"
  | "streak"
  | "eliminate"
  | "victory"
  | "complete";

export interface TutorialState {
  currentStep: TutorialStep;
  isActive: boolean;
  hasCompleted: boolean;
  canSkip: boolean;
  stepIndex: number;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  "welcome",
  "listen",
  "type",
  "submit",
  "streak",
  "eliminate",
  "victory",
  "complete",
];

const STEP_INFO: Record<
  TutorialStep,
  { title: string; description: string; highlight?: string }
> = {
  welcome: {
    title: "Welcome to HiveSpell",
    description:
      "Hear the word. Spell it fast. Outlast everyone. Let's play a quick tutorial round.",
    highlight: "tutorial-welcome",
  },
  listen: {
    title: "Listen Carefully",
    description:
      "A word will be spoken. Click the replay button (🔊) if you need to hear it again.",
    highlight: "tutorial-word",
  },
  type: {
    title: "Type the Word",
    description: "Type what you heard as fast as you can. Your WPM is calculated per word.",
    highlight: "tutorial-input",
  },
  submit: {
    title: "Submit Your Answer",
    description: "Press Enter to submit. Correct answers extend your streak and pass the turn.",
    highlight: "tutorial-submit",
  },
  streak: {
    title: "Build Your Streak",
    description:
      "Consecutive correct answers build your streak. Milestones at 3, 5, 10, 20, 50 unlock rewards!",
    highlight: "tutorial-streak",
  },
  eliminate: {
    title: "Don't Get Eliminated",
    description:
      "Wrong answers or running out of time eliminates you. Last player standing wins the round.",
    highlight: "tutorial-timer",
  },
  victory: {
    title: "Win the Game",
    description: "Survive all rounds to win! Winners earn nectar, titles, and bragging rights.",
    highlight: "tutorial-victory",
  },
  complete: {
    title: "You're Ready!",
    description:
      "Jump into a match and start spelling. Good luck, and may the best speller win!",
    highlight: "tutorial-complete",
  },
};

/**
 * Hook for managing the First-Time User Experience (FTUE) tutorial
 */
export function useTutorial() {
  const { userData } = useAuth();
  const [state, setState] = useState<TutorialState>({
    currentStep: "welcome",
    isActive: false,
    hasCompleted: false,
    canSkip: true,
    stepIndex: 0,
  });

  // Check if tutorial should auto-start for new users
  useEffect(() => {
    if (!userData) return;

    const isNewUser =
      userData.corrects === 0 && userData.wins === 0 && userData.title === "Newbee";
    const hasCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === "true";

    if (isNewUser && !hasCompleted) {
      // Small delay to let UI settle
      const timer = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isActive: true,
          currentStep: "welcome",
          stepIndex: 0,
        }));
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setState((prev) => ({ ...prev, hasCompleted: true }));
    }
  }, [userData]);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextIndex = Math.min(prev.stepIndex + 1, TUTORIAL_STEPS.length - 1);
      return {
        ...prev,
        stepIndex: nextIndex,
        currentStep: TUTORIAL_STEPS[nextIndex],
        canSkip: nextIndex < TUTORIAL_STEPS.length - 1,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const prevIndex = Math.max(prev.stepIndex - 1, 0);
      return {
        ...prev,
        stepIndex: prevIndex,
        currentStep: TUTORIAL_STEPS[prevIndex],
        canSkip: true,
      };
    });
  }, []);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
    setState((prev) => ({
      ...prev,
      isActive: false,
      hasCompleted: true,
    }));
  }, []);

  const restartTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
    setState({
      currentStep: "welcome",
      isActive: true,
      hasCompleted: false,
      canSkip: true,
      stepIndex: 0,
    });
  }, []);

  const getCurrentStepInfo = useCallback(() => {
    return STEP_INFO[state.currentStep];
  }, [state.currentStep]);

  const getProgress = useCallback(() => {
    return ((state.stepIndex + 1) / TUTORIAL_STEPS.length) * 100;
  }, [state.stepIndex]);

  return {
    ...state,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    restartTutorial,
    getCurrentStepInfo,
    getProgress,
    totalSteps: TUTORIAL_STEPS.length,
  };
}

/**
 * Reset tutorial for testing purposes
 */
export function resetTutorial() {
  localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
  localStorage.removeItem(TUTORIAL_STEP_KEY);
}