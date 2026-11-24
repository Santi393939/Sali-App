/**
 * Goals that adapt, both ways (as Apple Fitness and Strava do):
 *  - after 7 Salli days in a row at the same goal, all lit, offer the next
 *    step up;
 *  - after a week with 2 or fewer lit days, offer a lighter goal for now,
 *    so a busy stretch doesn't turn into giving up.
 * "Not yet" / "Keep" hides the offer for a week. Nothing changes unless the
 * person accepts.
 */
import { GOAL_LADDER, nextGoalStep, previousGoalStep } from '@/lib/habitGoal';
import { addDays } from '@/lib/salliDay';

import { getDay, isLit, savedDayKeys } from './days';
import { getSettings, updateSettings } from './settings';

export const STEP_UP_DAYS = 7;

export type StepUpOffer = { from: number; to: number };

/** `_version` changes with every count, so callers re-read after changes. */
export function stepUpOffer(today: string, _version: number): StepUpOffer | null {
  const { dailyGoal: goal, goalNudge } = getSettings();
  const to = nextGoalStep(goal);
  if (!to) return null;
  if (goalNudge && goalNudge.goal === goal && today < goalNudge.until) return null;
  for (let d = 1; d <= STEP_UP_DAYS; d++) {
    const day = getDay(addDays(today, -d));
    if (day.goal !== goal || day.total < goal) return null;
  }
  return { from: goal, to };
}

/** At most this many lit days in the last week before a lighter goal is offered. */
const EASE_LIT_DAYS = 2;

export function stepDownOffer(today: string, _version: number): StepUpOffer | null {
  const { dailyGoal: goal, goalNudge } = getSettings();
  if (goal <= GOAL_LADDER[0]) return null;
  if (goalNudge && goalNudge.goal === goal && today < goalNudge.until) return null;
  // Only once there is a full week of history to go on.
  const first = savedDayKeys()[0];
  if (!first || first > addDays(today, -STEP_UP_DAYS)) return null;
  let lit = 0;
  for (let d = 1; d <= STEP_UP_DAYS; d++) {
    const day = getDay(addDays(today, -d));
    if (day.goal !== goal) return null; // the goal changed this week: give it time
    if (isLit(day)) lit++;
  }
  return lit <= EASE_LIT_DAYS ? { from: goal, to: previousGoalStep(goal) } : null;
}

export function acceptStepUp(offer: StepUpOffer) {
  updateSettings({ dailyGoal: offer.to, goalNudge: null });
}

export function postponeStepUp(offer: StepUpOffer, today: string) {
  updateSettings({ goalNudge: { goal: offer.from, until: addDays(today, STEP_UP_DAYS) } });
}
