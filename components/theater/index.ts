/**
 * Theater Components - Phase 2b
 * Visual theater moments that respond to Gameplay Events
 * Each component subscribes to specific event types from the Event Bus
 */

export { WordReveal } from "./WordReveal";
export { SuccessTheater } from "./SuccessTheater";
export { FailureTheater } from "./FailureTheater";
export { TurnTransition } from "./TurnTransition";
export { VictorySequence } from "./VictorySequence";
export { IntermissionCard } from "./IntermissionCard";
export { StreakMilestone } from "./StreakMilestone";

export type { WordRevealProps } from "./WordReveal";
export type { SuccessTheaterProps } from "./SuccessTheater";
export type { FailureTheaterProps } from "./FailureTheater";
export type { TurnTransitionProps } from "./TurnTransition";
export type { VictorySequenceProps } from "./VictorySequence";
export type { IntermissionCardProps } from "./IntermissionCard";
export type { StreakMilestoneProps } from "./StreakMilestone";