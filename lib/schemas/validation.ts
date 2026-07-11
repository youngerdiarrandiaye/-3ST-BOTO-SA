import { z } from 'zod'

export const conducteurSchema = z.object({
  nom:            z.string().min(2, 'Nom trop court').max(100).trim(),
  prenom:         z.string().min(2, 'Prénom trop court').max(100).trim(),
  entreprise_id:  z.string().uuid('ID entreprise invalide'),
  fonction:       z.string().max(100).trim().optional(),
  zone_validite:  z.string().max(200).optional(),
  type_zone:      z.string().max(100).optional(),
  type_permis_conduite: z.array(z.string().max(50)).max(10).optional(),
  est_temporaire: z.boolean().optional(),
  date_naissance:          z.string().date().optional().nullable(),
  date_debut_autorisation: z.string().date().optional().nullable(),
  date_fin_autorisation:   z.string().date().optional().nullable(),
  permis_national:         z.string().max(50).optional().nullable(),
  permis_civil_autorite:   z.string().max(50).optional().nullable(),
  validation_sst:          z.boolean().optional(),
  validation_clinique:     z.boolean().optional(),
  date_validation_sst:     z.string().optional().nullable(),
  date_validation_clinique:z.string().optional().nullable(),
  contact_urgence_nom:     z.string().max(100).optional().nullable(),
  contact_urgence_tel:     z.string().max(20).optional().nullable(),
  statut:                  z.enum(['actif','suspendu','retire','inactif']).optional(),
})

export const infractionSchema = z.object({
  conducteur_id:      z.string().uuid('ID conducteur invalide'),
  type_infraction_id: z.string().uuid('Type infraction invalide'),
  zone_constatee:     z.enum(['miniere','hors_miniere','les_deux']),
  localisation:       z.string().min(2).max(500).trim(),
  description:        z.string().max(2000).trim().optional(),
  conducteur_refuse_signe: z.boolean().optional(),
  temoins: z.array(z.object({
    nom:        z.string().min(1).max(100).trim(),
    prenom:     z.string().min(1).max(100).trim(),
    matricule:  z.string().max(20).optional(),
    telephone:  z.string().max(20).optional(),
    declaration:z.string().max(2000).optional(),
  })).max(10).optional(),
})

export const sanctionSchema = z.object({
  conducteur_id:  z.string().uuid(),
  infraction_id:  z.string().uuid().optional(),
  type:           z.enum(['avertissement','suspension_temp','retrait_definitif']),
  date_debut:     z.string().date(),
  date_fin:       z.string().date().optional().nullable(),
  motif:          z.string().min(5).max(500).trim(),
})

export const formationSchema = z.object({
  conducteur_id:   z.string().uuid(),
  theme:           z.string().min(3).max(200).trim(),
  organisme:       z.string().min(2).max(200).trim(),
  date_debut:      z.string().date(),
  date_fin:        z.string().date().optional().nullable(),
  heures_validees: z.number().min(0).max(1000).optional(),
  nb_seances:      z.number().int().min(0).max(100),
  points_recuperes:z.number().int().min(0).max(10),
})

export const permisSchema = z.object({
  conducteur_id:   z.string().uuid(),
  categories:      z.array(z.string()).min(1),
  type_zone:       z.string().min(2),
  zone_validite:   z.string().optional(),
  date_delivrance: z.string().date(),
  date_expiration: z.string().date(),
  validation_sst:     z.boolean().optional(),
  validation_clinique:z.boolean().optional(),
}).refine(d => d.date_expiration > d.date_delivrance, {
  message: 'La date d\'expiration doit être après la date de délivrance',
  path: ['date_expiration'],
})

export const motDePasseSchema = z.object({
  ancien_mdp:    z.string().min(1),
  nouveau_mdp:   z.string().min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins 1 majuscule')
    .regex(/[0-9]/, 'Au moins 1 chiffre'),
  confirmer_mdp: z.string(),
}).refine(d => d.nouveau_mdp === d.confirmer_mdp, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmer_mdp'],
}).refine(d => d.ancien_mdp !== d.nouveau_mdp, {
  message: 'Le nouveau mot de passe doit être différent',
  path: ['nouveau_mdp'],
})

export const entrepriseSchema = z.object({
  nom:         z.string().min(2).max(200).trim(),
  description: z.string().max(500).trim().optional(),
  actif:       z.boolean().optional(),
})
