# Plateforme HSE 3ST — Documentation v1.0

> Gestion HSE pour site minier · Next.js · Supabase · Juillet 2026

---

## Sommaire

1. [Présentation](#présentation)
2. [Stack technique](#stack-technique)
3. [Lancer le projet](#lancer-le-projet)
4. [Rôles utilisateurs](#rôles-utilisateurs)
5. [Modules](#modules)
6. [Use Cases](#use-cases)
7. [Matrice des permissions](#matrice-des-permissions)
8. [Système de points](#système-de-points)

---

## Présentation

La plateforme 3ST centralise la gestion HSE (Hygiène, Sécurité, Environnement) d'un site minier. Elle couvre :

- Le suivi des **conducteurs d'engins** et de leur dossier
- La délivrance et le contrôle des **permis internes** de conduite
- La déclaration et le traitement des **infractions** aux règles HSE
- L'application et le suivi des **sanctions** disciplinaires
- L'organisation des **formations** HSE et la récupération de points
- La gestion des **entreprises** sous-traitantes et partenaires
- L'administration des **comptes utilisateurs** par rôle

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js (App Router) · TypeScript · Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| API | Next.js Route Handlers |
| Auth | Supabase Auth (email/password) |

---

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Variables d'environnement requises dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| **Admin** | Accès total — gestion des comptes, rôles, et toutes les opérations |
| **HSE** | CRUD complet sur tous les modules opérationnels |
| **SST** | Accès similaire à HSE, sans gestion des entreprises |
| **Direction** | Consultation et rapports uniquement — aucune modification |
| **Agent terrain** | Déclaration d'infractions uniquement |

---

## Modules

### Dashboard

Vue d'ensemble avec indicateurs clés :
- Conducteurs actifs · Infractions du mois · Permis expirant (< 30 j) · Suspensions actives
- Graphique des infractions sur les 8 dernières semaines
- Liste des 10 dernières infractions

---

### Conducteurs

Dossier complet de chaque conducteur d'engin.

| Champ | Détail |
|-------|--------|
| Identité | Nom, prénom, date de naissance |
| Matricule | Identifiant unique site |
| Statut | `actif` · `suspendu` · `retire` · `inactif` |
| Points | Capital 0–20 pts |
| Entreprise | Société d'affectation |
| Habilitations | SST + Visite médicale |
| Zone de validité | Minière · Administrative · Les deux |
| Contact urgence | Nom + téléphone |

| Action | Rôles |
|--------|-------|
| Créer | Admin · HSE · SST |
| Consulter / Rechercher | Admin · HSE · SST · Direction |
| Modifier | Admin · HSE · SST |
| Changer le statut | Admin · HSE |

---

### Permis internes

Autorisation de conduite sur site délivrée par le service HSE.

**Cycle de vie**

```
Valide ──► Suspendu ──► Valide
                    └──► Retiré (définitif)
Valide ──► Expiré   ──► Renouvelé
```

| Action | Rôles |
|--------|-------|
| Délivrer | Admin · HSE · SST |
| Suspendre / Réactiver | Admin · HSE · SST |
| Retirer définitivement | Admin · HSE · SST |
| Renouveler | Admin · HSE · SST |

> Permis expirant dans moins de 30 jours → alerte Dashboard.

---

### Infractions

Déclaration et traitement des manquements aux règles HSE.

**Niveaux de gravité** : `mineure` · `majeure` · `critique` · `eliminatoire`

**Cycle de vie**

```
Déclarée ──► Traitée
Déclarée ──► Contestée ──► Traitée / Annulée
```

| Action | Rôles |
|--------|-------|
| Déclarer | Admin · HSE · SST · Agent terrain |
| Traiter (applique déduction de points) | Admin · HSE · SST |
| Sanctionner (crée une sanction) | Admin · HSE · SST |
| Annuler | Admin |

---

### Sanctions

Mesures disciplinaires formelles liées aux infractions.

| Type | Description |
|------|-------------|
| `suspension_temp` | Durée définie — levée possible manuellement |
| `retrait_definitif` | Irrévocable — conducteur passe en statut `retire` |

| Action | Rôles |
|--------|-------|
| Appliquer | Admin · HSE · SST |
| Lever une suspension | Admin · HSE · SST |

> Certains types d'infractions déclenchent une sanction automatique à la déclaration.

---

### Formations

Formations HSE permettant la récupération de points.

**Cycle de vie**

```
En cours ──► Validée  → points crédités au conducteur
         └──► Annulée → aucun effet
```

| Action | Rôles |
|--------|-------|
| Créer | Admin · HSE · SST |
| Valider (déclenche récupération points) | Admin · HSE · SST |
| Annuler | Admin · HSE · SST |

---

### Entreprises

Sociétés intervenant sur le site (sous-traitants, partenaires, internes).

**Types** : `sous_traitant` · `partenaire` · `interne`

| Action | Rôles |
|--------|-------|
| Créer / Modifier | Admin · HSE |
| Activer / Désactiver | Admin · HSE |
| Supprimer (bloqué si conducteurs rattachés) | Admin |

---

### Utilisateurs

Comptes d'accès à la plateforme — administration réservée aux admins.

| Action | Rôles |
|--------|-------|
| Créer un compte | Admin |
| Changer le rôle (impossible sur soi-même) | Admin |
| Activer / Désactiver (impossible sur soi-même) | Admin |
| Modifier nom / téléphone | Admin · Soi-même |

---

### Rapports

Export de données agrégées pour suivi et reporting.

**Rapports disponibles** : Conducteurs · Infractions · Permis expirants · Formations · Sanctions

**Formats** : PDF · CSV

**Accès** : Admin · HSE · SST · Direction

---

## Use Cases

### UC-01 — Un agent terrain déclare une infraction

**Acteur** : Agent terrain  
**Précondition** : Connecté à la plateforme, le conducteur en faute est enregistré dans le système.

1. L'agent accède à **Infractions → Nouvelle infraction**.
2. Il sélectionne le conducteur par matricule ou nom.
3. Il choisit le type d'infraction dans la liste (ex. : *Excès de vitesse*).
4. Il renseigne la date/heure, le lieu, et les éventuels témoins.
5. Il soumet — l'infraction est créée au statut **Déclarée**.
6. Une notification est visible pour les agents HSE/SST sur le dashboard.

**Résultat** : L'infraction est enregistrée et en attente de traitement par le service HSE.

---

### UC-02 — Un agent HSE traite une infraction et applique une sanction

**Acteur** : Agent HSE  
**Précondition** : Une infraction est au statut **Déclarée**.

1. L'agent HSE ouvre la fiche de l'infraction.
2. Il vérifie les informations et clique sur **Traiter**.
3. Les points sont automatiquement déduits du capital du conducteur.
4. Si le capital atteint 0, le conducteur est suspendu automatiquement.
5. L'agent clique sur **Sanctionner** pour créer une sanction formelle.
6. Il choisit le type (`suspension_temp` ou `retrait_definitif`), renseigne la durée et le motif.
7. La sanction est appliquée — le permis du conducteur est suspendu ou retiré.

**Résultat** : L'infraction est traitée, les points sont déduits, la sanction est active.

---

### UC-03 — Un conducteur conteste une infraction

**Acteur** : Agent HSE (au nom du conducteur)  
**Précondition** : L'infraction est au statut **Déclarée**.

1. L'agent HSE ouvre la fiche de l'infraction.
2. Il passe le statut à **Contestée** en indiquant le motif de contestation.
3. L'infraction est mise en attente — aucune déduction de points à ce stade.
4. Après instruction, l'agent HSE décide :
   - **Valider** → statut **Traitée**, points déduits.
   - **Annuler** → statut **Annulée**, aucune conséquence sur les points.

**Résultat** : La contestation est instruite et clôturée avec ou sans sanction.

---

### UC-04 — Renouvellement d'un permis interne expiré

**Acteur** : Agent HSE ou SST  
**Précondition** : Le permis d'un conducteur est au statut **Expiré**.

1. L'agent accède à la fiche du conducteur → onglet **Permis**.
2. Il clique sur **Renouveler** sur le permis expiré.
3. Il définit les nouvelles dates de validité, catégories et zone.
4. Le nouveau permis est créé au statut **Valide**.
5. L'ancien permis reste archivé dans l'historique.

**Résultat** : Le conducteur dispose d'un permis valide et peut reprendre la conduite sur site.

---

### UC-05 — Récupération de points via une formation

**Acteur** : Agent HSE ou SST  
**Précondition** : Un conducteur a perdu des points suite à des infractions.

1. L'agent crée une formation : organisme, type, dates de début/fin, conducteur.
2. La formation est au statut **En cours**.
3. À l'issue de la formation, l'agent clique sur **Valider**.
4. Les points définis pour cette formation sont crédités au conducteur.
5. Si le conducteur était suspendu pour solde nul, l'agent peut lever la suspension manuellement.

**Résultat** : Le conducteur récupère des points et peut être réactivé.

---

### UC-06 — L'admin désactive un compte utilisateur

**Acteur** : Admin  
**Précondition** : Un utilisateur quitte l'organisation ou doit être suspendu.

1. L'admin accède à **Utilisateurs** et ouvre le profil concerné.
2. Il clique sur **Désactiver le compte** dans la zone de danger.
3. Une confirmation est demandée (modale avec nom de l'utilisateur).
4. Le compte est désactivé — l'utilisateur ne peut plus se connecter.
5. L'action est irréversible depuis l'interface (peut être réactivée de la même façon).

**Résultat** : L'accès à la plateforme est immédiatement révoqué.

---

### UC-07 — La direction consulte un rapport mensuel

**Acteur** : Direction  
**Précondition** : Connectée avec le rôle `direction`.

1. L'utilisateur accède à **Rapports**.
2. Il sélectionne le rapport **Infractions** et choisit la période (mois en cours).
3. Il visualise le tableau récapitulatif (conducteur, type, gravité, statut, points déduits).
4. Il exporte en **PDF** pour transmission à la hiérarchie.

**Résultat** : Un rapport PDF est généré sans que l'utilisateur puisse modifier aucune donnée.

---

### UC-08 — Alerte permis expirant

**Acteur** : Agent HSE  
**Précondition** : Des permis arrivent à échéance dans moins de 30 jours.

1. L'agent HSE consulte le Dashboard — la tuile **Permis expirants** affiche un compteur.
2. Il clique sur la tuile pour accéder à la liste filtrée des permis concernés.
3. Pour chaque permis, il contacte le conducteur et planifie le renouvellement.
4. Il renouvelle les permis (UC-04) avant leur expiration.

**Résultat** : Aucun conducteur ne se retrouve en conduite avec un permis expiré.

---

## Matrice des permissions

| Module | Admin | HSE | SST | Direction | Agent |
|--------|:-----:|:---:|:---:|:---------:|:-----:|
| Dashboard | ✅ | ✅ | ✅ | 👁 | — |
| Conducteurs | ✅ | ✅ | ⚡ | 👁 | 👁 |
| Permis | ✅ | ✅ | ✅ | 👁 | — |
| Infractions | ✅ | ✅ | ✅ | 👁 | ➕ |
| Sanctions | ✅ | ✅ | ✅ | 👁 | — |
| Formations | ✅ | ✅ | ✅ | 👁 | — |
| Entreprises | ✅ | ✅ | — | — | — |
| Utilisateurs | ✅ | — | — | — | — |
| Rapports | ✅ | ✅ | ✅ | 👁 | — |

**Légende**
- ✅ CRUD complet
- 👁 Lecture seule
- ➕ Création uniquement
- ⚡ Accès partiel (pas de changement de statut conducteur)
- — Aucun accès

---

## Système de points

Chaque conducteur démarre avec un capital de **20 points**.

| Points | Niveau | Indicateur |
|--------|--------|------------|
| > 10 | Normal | Vert |
| 6 – 10 | Attention | Orange |
| 1 – 5 | Critique | Rouge |
| 0 | Suspension automatique | — |

| Événement | Effet |
|-----------|-------|
| Infraction déclarée & traitée | − X pts (selon le type) |
| Formation validée | + X pts |
| Solde ≤ 0 | Suspension automatique immédiate |
| Infraction éliminatoire | Retrait définitif du permis |

---

*3ST HSE Platform v1.0 · Juillet 2026*
