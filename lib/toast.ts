'use client'

import { toast } from 'vyrn'

// ── SUCCÈS ──────────────────────────────────────────────────
export const toastSuccess = {

  conducteurCree: (nom: string) => toast.success(
    `✓ Conducteur ${nom} enregistré avec succès`,
    { duration: 3000 }
  ),

  conducteurModifie: (nom: string) => toast.success(
    `✓ Fiche de ${nom} mise à jour`,
    { duration: 3000 }
  ),

  conducteurSuspendu: (nom: string) => toast.success(
    `✓ ${nom} suspendu — QR Code désactivé immédiatement`,
    { duration: 4000 }
  ),

  conducteurReactive: (nom: string) => toast.success(
    `✓ ${nom} réactivé — Conduite autorisée`,
    { duration: 4000 }
  ),

  infractionEnregistree: (type: string, points: number) => toast.success(
    `✓ Infraction enregistrée — ${points} points retirés (${type})`,
    { duration: 4000 }
  ),

  infractionOffline: () => toast.success(
    `✓ Infraction sauvegardée localement — Sync en attente`,
    { duration: 5000 }
  ),

  permisDelivre: (numero: string) => toast.success(
    `✓ Permis ${numero} délivré — QR Code généré`,
    { duration: 4000 }
  ),

  permisRenouvele: (numero: string) => toast.success(
    `✓ Permis ${numero} renouvelé`,
    { duration: 3000 }
  ),

  formationValidee: (points: number, nom?: string) => toast.success(
    nom
      ? `✓ Formation validée — ${nom} récupère ${points} pts`
      : `✓ Formation validée — ${points} pts crédités`,
    { duration: 4000 }
  ),

  documentUploade: (type: string) => toast.success(
    `✓ Document "${type}" téléversé avec succès`,
    { duration: 3000 }
  ),

  validationApprouvee: (etape: string) => toast.success(
    `✓ ${etape} approuvée`,
    { duration: 3000 }
  ),

  motDePasseModifie: () => toast.success(
    `✓ Mot de passe modifié — Reconnectez-vous`,
    { duration: 4000 }
  ),

  exportGenere: (format: string) => toast.success(
    `✓ Rapport ${format} généré et téléchargé`,
    { duration: 3000 }
  ),

  sauvegarde: () => toast.success(
    `✓ Modifications enregistrées`,
    { duration: 2000 }
  ),

  infractionTraitee: () => toast.success(
    `✓ Infraction traitée et clôturée`,
    { duration: 3000 }
  ),

  infractionContestee: () => toast.success(
    `✓ Infraction marquée contestée — En attente de vérification`,
    { duration: 4000 }
  ),

  infractionAnnulee: () => toast.success(
    `✓ Infraction annulée`,
    { duration: 3000 }
  ),

  infractionCloturee: () => toast.success(
    `✓ Contestation clôturée — Infraction confirmée`,
    { duration: 3000 }
  ),

  infractionModifiee: () => toast.success(
    `✓ Infraction corrigée`,
    { duration: 3000 }
  ),

  permisSuspendu: () => toast.success(
    `✓ Permis suspendu — Conducteur bloqué sur site`,
    { duration: 4000 }
  ),

  permisRetire: () => toast.success(
    `✓ Permis retiré définitivement`,
    { duration: 4000 }
  ),

  permisReactive: () => toast.success(
    `✓ Permis réactivé — Conducteur autorisé`,
    { duration: 4000 }
  ),

  permisExpire: () => toast.success(
    `✓ Permis clôturé`,
    { duration: 3000 }
  ),

  formationAnnulee: () => toast.success(
    `✓ Formation annulée`,
    { duration: 3000 }
  ),

  formationReactivee: () => toast.success(
    `✓ Formation remise en cours`,
    { duration: 3000 }
  ),

  sanctionLevee: () => toast.success(
    `✓ Sanction levée — Conducteur réactivé si aucune autre sanction active`,
    { duration: 4000 }
  ),

  entrepriseCreee: (nom: string) => toast.success(
    `✓ Entreprise "${nom}" créée avec succès`,
    { duration: 3000 }
  ),

  entrepriseActivee: (nom: string) => toast.success(
    `✓ ${nom} activée`,
    { duration: 2000 }
  ),

  entrepriseDesactivee: (nom: string) => toast.success(
    `✓ ${nom} désactivée`,
    { duration: 2000 }
  ),

  utilisateurCree: (nom: string) => toast.success(
    `✓ Compte de ${nom} créé avec succès`,
    { duration: 3000 }
  ),

  utilisateurActive: (nom: string) => toast.success(
    `✓ Compte de ${nom} activé`,
    { duration: 2000 }
  ),

  utilisateurDesactive: (nom: string) => toast.success(
    `✓ Compte de ${nom} désactivé`,
    { duration: 2000 }
  ),
}

// ── ERREURS ─────────────────────────────────────────────────
export const toastError = {

  erreurServeur: () => toast.error(
    `✗ Erreur serveur — Réessayez ou contactez l'administrateur`,
    { duration: 6000 }
  ),

  champObligatoire: (champ: string) => toast.error(
    `✗ Champ requis manquant : ${champ}`,
    { duration: 4000 }
  ),

  matriculeExiste: (matricule: string) => toast.error(
    `✗ Le matricule ${matricule} existe déjà dans le système`,
    { duration: 5000 }
  ),

  conducteurSansSst: () => toast.error(
    `✗ Impossible — Validation SST manquante`,
    { duration: 5000 }
  ),

  conducteurSansClinique: () => toast.error(
    `✗ Impossible — Certificat médical manquant`,
    { duration: 5000 }
  ),

  conducteurSuspendu: (nom: string) => toast.error(
    `✗ ${nom} est SUSPENDU — Conduite interdite`,
    { duration: 6000 }
  ),

  pointsInsuffisants: (nom: string, points: number) => toast.error(
    `✗ ${nom} — ${points} point(s) — Conduite interdite (min 1 pt)`,
    { duration: 6000 }
  ),

  permisExpire: (nom: string) => toast.error(
    `✗ Permis de ${nom} EXPIRÉ — Renouvellement requis`,
    { duration: 6000 }
  ),

  connexionEchouee: () => toast.error(
    `✗ Email ou mot de passe incorrect`,
    { duration: 4000 }
  ),

  ancienMotDePasseIncorrect: () => toast.error(
    `✗ Ancien mot de passe incorrect`,
    { duration: 4000 }
  ),

  fichierTropLourd: (max: string) => toast.error(
    `✗ Fichier trop lourd — Maximum autorisé : ${max}`,
    { duration: 4000 }
  ),

  formatNonAccepte: (formats: string) => toast.error(
    `✗ Format non accepté — Formats autorisés : ${formats}`,
    { duration: 4000 }
  ),

  rlsRefus: () => toast.error(
    `✗ Accès refusé — Permissions insuffisantes`,
    { duration: 5000 }
  ),

  syncEchouee: () => toast.error(
    `✗ Synchronisation échouée — Vérifiez la connexion`,
    { duration: 5000 }
  ),
}

// ── AVERTISSEMENTS ───────────────────────────────────────────
export const toastWarn = {

  permisExpirantBientot: (nom: string, jours: number) => toast.warning(
    `⚠ Permis de ${nom} expire dans ${jours} jours`,
    { duration: 6000 }
  ),

  pointsFaibles: (nom: string, points: number) => toast.warning(
    `⚠ ${nom} — Plus que ${points} point(s) restants`,
    { duration: 5000 }
  ),

  conducteurTemporaireExpire: (nom: string, jours: number) => toast.warning(
    `⚠ Autorisation de ${nom} expire dans ${jours} jours`,
    { duration: 5000 }
  ),

  recidiveDetectee: (type: string, nb: number) => toast.warning(
    `⚠ RÉCIDIVE détectée — ${type} (${nb}x en 12 mois)`,
    { duration: 6000 }
  ),

  validationManquante: (etape: string) => toast.warning(
    `⚠ Validation manquante : ${etape}`,
    { duration: 5000 }
  ),

  modeHorsLigne: () => toast.warning(
    `⚠ Mode hors ligne — Actions sauvegardées localement`,
    { duration: 0 }
  ),

  syncEnAttente: (nb: number) => toast.warning(
    `⚠ ${nb} action(s) en attente de synchronisation`,
    { duration: 5000 }
  ),

  validationRefusee: (etape: string) => toast.warning(
    `⚠ Refus enregistré — ${etape}`,
    { duration: 4000 }
  ),
}

// ── INFORMATIONS ─────────────────────────────────────────────
export const toastInfo = {

  chargement: (action: string) => toast.loading(
    `${action} en cours...`,
    { duration: 0 }
  ),

  syncReussie: (nb: number) => toast.info(
    `↑ ${nb} action(s) synchronisée(s) avec succès`,
    { duration: 4000 }
  ),

  qrCodeGenere: () => toast.info(
    `QR Code généré — Prêt à imprimer`,
    { duration: 3000 }
  ),

  sessionExpiree: () => toast.info(
    `Session expirée — Reconnectez-vous`,
    { duration: 5000 }
  ),

  copie: (element: string) => toast.info(
    `${element} copié dans le presse-papier`,
    { duration: 2000 }
  ),
}
