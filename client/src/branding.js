/**
 * Personnalisation rapide de l’identité affichée.
 *
 * Pour te différencier des applis génériques :
 * - Choisis un nom orienté ta cible (ex. « StudiFlow », « Agenda Lycée », « Focus Campus »).
 * - Ajuste l’œil de bœuf + le sous-titre : ton + promesse unique (pas « todo list »).
 * - Garde pageTitle aligné avec index.html <title> et meta theme-color si tu changes la couleur.
 * - Voir aussi brand-theme.css (couleurs, typo) et public/favicon.svg (icône).
 */
export const BRAND = {
  /** Onglet navigateur — doit correspondre à <title> dans index.html */
  pageTitle: "Daily Planner",

  /** Titre principal (h1) */
  productName: "Daily Planner",

  /** Petite ligne au-dessus du titre (audience ou catégorie) */
  eyebrow: "Étudiants",

  /** Accroche : une phrase qui reflète TON positionnement */
  subtitle:
    "Organise tes cours et tes blocs du jour — titre + heure, c’est tout.",

  /** Notifications système (rappels 5 min avant) */
  notifications: {
    titleBefore: "Daily Planner — dans 5 minutes",
  },
};
