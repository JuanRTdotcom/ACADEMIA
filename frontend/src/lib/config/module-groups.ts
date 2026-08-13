export type ModuleGroupKey =
  | 'system'
  | 'superadmin'
  | 'administrator'
  | 'clinic'
  | 'commercial'
  | 'scheduling'
  | 'reports'
  | 'profile'
  | 'resources';

export const MODULE_GROUP_ORDER: ModuleGroupKey[] = [
  'system',
  'superadmin',
  'administrator',
  'clinic',
  'commercial',
  'scheduling',
  'reports',
  'profile',
  'resources',
];

export function moduleGroupKey(code: string): ModuleGroupKey {
  if (code.startsWith('superadmin.')) return 'superadmin';
  if (code.startsWith('administrator.')) return 'administrator';
  if (code === 'clinic' || code.startsWith('clinic.')) return 'clinic';
  if (['operations.sales', 'operations.inventory', 'operations.billing'].includes(code)) return 'commercial';
  if (['operations.appointments', 'operations.reminders'].includes(code)) return 'scheduling';
  if (code === 'operations.reports') return 'reports';
  if (code.startsWith('profile.')) return 'profile';
  if (code === 'resources') return 'resources';
  return 'system';
}
