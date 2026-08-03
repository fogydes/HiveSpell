import { useNavigate } from "react-router-dom";

/**
 * Navigate to Battle Pass page
 */
export const navigateToBattlePass = () => {
  // This is a helper that needs to be called within a component
  // Using window.location for non-React contexts
  window.location.href = "/battle-pass";
};

/**
 * Navigate to Challenges page
 */
export const navigateToChallenges = () => {
  window.location.href = "/challenges";
};