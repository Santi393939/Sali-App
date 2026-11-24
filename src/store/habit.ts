/**
 * Growing the habit: after 7 Salli days in a row at the same goal, all lit,
 * offer the next goal step. "Not yet" hides the offer for a week. Nothing
 * changes unless the person accepts.
 */
import { nextGoalStep } from '@/lib/habitGoal';
import { addDays } from '@/lib/salliDay';

import { getDay } from './days';
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

export function acceptStepUp(offer: StepUpOffer) {
  updateSettings({ dailyGoal: offer.to, goalNudge: null });
}

export function postponeStepUp(offer: StepUpOffer, today: string) {
  updateSettings({ goalNudge: { goal: offer.from, until: addDays(today, STEP_UP_DAYS) } });
}
