/**
 * Starting goal from three questions about someone's current habit.
 *
 * The idea is to build a daily habit, so the first goal should be easy to
 * keep every day and only a little more than what the person does now:
 *  - not yet daily: the stretch is doing it every day, so the amount stays
 *    at (or a step below) what they already do;
 *  - already daily: one step up;
 *  - the time they can give limits how far the goal stretches, but never
 *    pulls it below what they already do.
 * Then Salli offers the next step after each week of lit days.
 */
export type Frequency = 'rarely' | 'weekly' | 'most' | 'daily';
export type Amount = 'few' | 'tens' | 'hundred' | 'many';
export type Time = 'one' | 'five' | 'fifteen' | 'more';

export type HabitAnswers = { frequency: Frequency; amount: Amount; time: Time };

/** Goal steps, small at the start so each one feels reachable. */
export const GOAL_LADDER = [5, 10, 15, 25, 33, 50, 100, 150, 200, 300, 500, 1000, 2000, 3000];

/** Many scholars describe 300 a day as the least of "abundant" salawat. */
export const ABUNDANT_GOAL = 300;

const CURRENT: Record<Amount, number> = { few: 5, tens: 25, hundred: 100, many: 300 };
const STEP: Record<Frequency, number> = { rarely: -1, weekly: 0, most: 0, daily: 1 };
/** A short salawat takes about 2–3 seconds, so roughly 25 a minute (kept gentle). */
const TIME_CAP: Record<Time, number> = { one: 25, five: 100, fifteen: 300, more: 3000 };

const indexOf = (goal: number) => {
  let i = 0;
  while (i < GOAL_LADDER.length - 1 && GOAL_LADDER[i + 1] <= goal) i++;
  return i;
};

export function recommendGoal({ frequency, amount, time }: HabitAnswers): number {
  const current = CURRENT[amount];
  const i = Math.max(0, Math.min(GOAL_LADDER.length - 1, indexOf(current) + STEP[frequency]));
  const stretched = GOAL_LADDER[i];
  return Math.max(GOAL_LADDER[0], Math.min(stretched, Math.max(TIME_CAP[time], frequency === 'rarely' ? 0 : current)));
}

/** The next goal step above `goal`, or null at the top. */
export function nextGoalStep(goal: number): number | null {
  return GOAL_LADDER.find((g) => g > goal) ?? null;
}

/** The step below `goal` (never under the first step). */
export function previousGoalStep(goal: number): number {
  return [...GOAL_LADDER].reverse().find((g) => g < goal) ?? GOAL_LADDER[0];
}
