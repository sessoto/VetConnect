export const TRIAGE_LEVELS = ['red', 'yellow', 'green'] as const;
export type TriageLevel = (typeof TRIAGE_LEVELS)[number];

export const TRIAGE_LEVEL_ORDER: Record<TriageLevel, number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

export const ROLES = ['admin', 'vet', 'assistant'] as const;
export type Role = (typeof ROLES)[number];

export const CARE_TASK_TYPES = [
  'medication',
  'feeding',
  'hygiene',
  'control',
  'other',
] as const;
export type CareTaskType = (typeof CARE_TASK_TYPES)[number];

export const RECURRENCES = ['none', 'every_n_hours', 'daily'] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const CARE_TASK_STATUSES = ['pending', 'done', 'skipped'] as const;
export type CareTaskStatus = (typeof CARE_TASK_STATUSES)[number];

export const PATIENT_STATUSES = ['active', 'discharged'] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
