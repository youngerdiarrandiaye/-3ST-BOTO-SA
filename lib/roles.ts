import type { RoleUtilisateur } from './types'

// Accès par section
export const ACCES: Record<string, RoleUtilisateur[]> = {
  infractions_write: ['admin', 'hse', 'sst', 'agent'],
  permis_write:      ['admin', 'hse', 'sst'],
  formations_write:  ['admin', 'hse', 'sst'],
  sanctions_write:   ['admin', 'hse', 'sst'],
  rapports_read:     ['admin', 'hse', 'sst', 'direction'],
  entreprises_write: ['admin', 'hse'],
  admin_only:        ['admin'],
}

export function peutAcceder(role: RoleUtilisateur | undefined, section: keyof typeof ACCES) {
  if (!role) return false
  return ACCES[section].includes(role)
}
