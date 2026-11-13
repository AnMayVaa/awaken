export type StepsSupport = 'auto' | 'manual';

export function stepsSupport(): StepsSupport {
  return 'manual';
}

export async function readTodaySteps(): Promise<number | null> {
  return null;
}
