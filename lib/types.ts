export type RoleUtilisateur  = 'admin' | 'hse' | 'sst' | 'direction' | 'agent'
export type StatutConducteur = 'actif' | 'suspendu' | 'retire' | 'inactif'
export type StatutPermis     = 'valide' | 'suspendu' | 'retire' | 'expire'
export type GraviteInfraction = 'mineure' | 'majeure' | 'critique' | 'eliminatoire'
export type TypeSanction     = 'suspension_temp' | 'retrait_definitif'
export type StatutFormation  = 'en_cours' | 'validee' | 'annulee'
export type StatutInfraction = 'declaree' | 'traitee' | 'contestee' | 'annulee'
export type TypeEntreprise   = 'sous_traitant' | 'partenaire' | 'interne'
export type ResultatTest     = 'reussi' | 'echoue' | 'en_attente'
export type TypeTest         = 'initial' | 'reprise'
export type ZoneInfraction   = 'miniere' | 'hors_miniere' | 'les_deux'
export type ZoneValidite     = 'miniere' | 'administrative' | 'les_deux'

export interface Entreprise {
  id: string
  nom: string
  type: TypeEntreprise
  contact_nom: string | null
  contact_tel: string | null
  contact_email: string | null
  actif: boolean
  created_at: string
  updated_at: string
}

export interface Utilisateur {
  id: string
  email: string
  nom: string
  prenom: string
  role: RoleUtilisateur
  entreprise_id: string | null
  telephone: string | null
  service: '3st' | 'sst_hse' | null
  actif: boolean
  created_at: string
  updated_at: string
}

export interface Conducteur {
  id: string
  matricule: string
  nom: string
  prenom: string
  date_naissance: string | null
  photo_url: string | null
  entreprise_id: string
  statut: StatutConducteur
  points_actuels: number
  permis_national: string | null
  permis_civil_autorite: string | null
  // V2
  fonction: string | null
  type_permis_conduite: string[]
  validation_sst: boolean
  date_validation_sst: string | null
  validation_clinique: boolean
  date_validation_clinique: string | null
  zone_validite: ZoneValidite | null
  contact_urgence_nom: string | null
  contact_urgence_tel: string | null
  created_at: string
  updated_at: string
  entreprises?: { nom: string }
}

export interface PermisInterne {
  id: string
  conducteur_id: string
  numero: string
  qr_code_url: string | null
  categories: string[]
  date_delivrance: string
  date_expiration: string
  statut: StatutPermis
  delivre_par: string | null
  // V2
  zone_validite: ZoneValidite | null
  type_permis_site: string | null
  validation_sst: boolean
  validation_clinique: boolean
  motif_changement?: string | null
  created_at: string
  updated_at: string
  conducteurs?: { nom: string; prenom: string; matricule: string }
}

export interface TypeInfraction {
  id: string
  code: string
  libelle: string
  gravite: GraviteInfraction
  points_retires: number
  suspend_auto: boolean
  description: string | null
  actif: boolean
  // V2
  zone_applicable: ZoneInfraction
  retrait_definitif_auto: boolean
  created_at: string
}

export interface Temoin {
  id: string
  infraction_id: string
  nom: string
  prenom: string | null
  matricule: string | null
  telephone: string | null
  declaration: string | null
  created_at: string
}

export interface Infraction {
  id: string
  conducteur_id: string
  agent_id: string
  type_infraction_id: string
  date_heure: string
  localisation: string | null
  description: string | null
  photos_urls: string[]
  statut: StatutInfraction
  sync_id: string | null
  // V2
  zone_constatee: ZoneInfraction | null
  est_recidive: boolean
  nb_recidives: number
  conducteur_refuse_signe: boolean
  created_at: string
  updated_at: string
  signature_agent: string | null
  signature_conducteur: string | null
  motif_changement: string | null
  conducteurs?: { nom: string; prenom: string; matricule: string }
  types_infraction?: {
    code: string
    libelle: string
    gravite: GraviteInfraction
    points_retires: number
    zone_applicable: ZoneInfraction
    retrait_definitif_auto: boolean
  }
  utilisateurs?: { nom: string; prenom: string; service?: '3st' | 'sst_hse' | null }
  temoins?: Temoin[]
}

export interface Sanction {
  id: string
  conducteur_id: string
  infraction_id: string | null
  type: TypeSanction
  date_debut: string
  date_fin: string | null
  motif: string
  decideur_id: string | null
  levee_le: string | null
  levee_par: string | null
  created_at: string
  conducteurs?: { nom: string; prenom: string; matricule: string }
}

export interface Formation {
  id: string
  conducteur_id: string
  organisme: string
  date_debut: string
  date_fin: string | null
  points_recuperes: number
  attestation_url: string | null
  statut: StatutFormation
  valide_par: string | null
  // V2
  theme: string | null
  formateur_nom: string | null
  formateur_qualif: string | null
  nb_seances: number
  nb_seances_faites: number
  duree_par_seance: number | null
  test_reprise_requis: boolean
  test_reprise_resultat: ResultatTest | null
  test_reprise_date: string | null
  created_at: string
  updated_at: string
  conducteurs?: { nom: string; prenom: string; matricule: string }
}

export interface TestConduite {
  id: string
  conducteur_id: string
  evaluateur_id: string | null
  date_test: string
  type: TypeTest
  resultat: ResultatTest
  score: number | null
  observations: string | null
  permis_id: string | null
  created_at: string
  evaluateur?: { nom: string; prenom: string }
}

export interface DashboardStats {
  conducteurs_actifs: number
  infractions_mois: number
  permis_expirant_30j: number
  conducteurs_suspendus: number
}
