// NeonWave Changelog Registry
const Changelogs = {
    "1.4.16": [
        "NeonWave devient installable comme PWA iPhone depuis Safari avec icone, splash screen, mode plein ecran et service worker.",
        "Ajout d'un panneau d'installation iOS propre qui guide vers Ajouter a l'ecran d'accueil.",
        "Amelioration du player PWA avec Media Session, controles ecran verrouille/casque et gestion des zones iPhone."
    ],
    "1.4.15": [
        "Les albums issus des profils artistes s'ouvrent maintenant directement sur leur tracklist au lieu de lancer une recherche.",
        "Ajout du chargement direct des albums Deezer de secours avec pochettes, infos album et titres jouables par resolution metadonnees."
    ],
    "1.4.14": [
        "Restauration des titres populaires et de la discographie sur les profils artistes lorsque Spotify renvoie vide ou bloque les requetes.",
        "Ajout d'un fallback Deezer avec cache pour recuperer les vraies pochettes, les photos artistes, les albums et les singles/EP.",
        "Correction du mapping des titres de secours afin qu'ils se resolvent par metadonnees sans etre confondus avec de faux IDs Spotify."
    ],
    "1.4.13": [
        "Le bilan hebdomadaire affiche désormais les vraies photos des artistes et les pochettes des morceaux, y compris dans le mode test du profil.",
        "Correction des anciennes URLs d'images invalides et ajout d'un fallback automatique lorsqu'une image distante ne répond plus.",
        "Le chargement des morceaux populaires analyse jusqu'à 20 albums avec une concurrence limitée afin d'éviter les erreurs Spotify."
    ],
    "1.4.12": [
        "Résolution du problème de chargement des morceaux populaires : correction du 403 Forbidden sur l'API bulk de Spotify en repassant sur des requêtes d'albums individuelles en parallèle."
    ],
    "1.4.11": [
        "Optimisation de l'affichage des titres populaires (interleaving sur 20 albums triés par priorité d'albums studio en une seule requête), garantissant l'affichage des véritables morceaux populaires de l'artiste."
    ],
    "1.4.10": [
        "Augmentation significative des limites de discographie : chargement de la discographie complète de l'artiste (jusqu'à 50 albums et singles au lieu de seulement 10), résolvant le problème de l'affichage vide des albums."
    ],
    "1.4.9": [
        "Amélioration des morceaux populaires : les morceaux sont maintenant mélangés intelligemment à travers les différents albums de l'artiste (interleaving), évitant d'afficher uniquement les morceaux d'un seul album."
    ],
    "1.4.8": [
        "Correction de l'affichage des jaquettes d'albums pour les pistes d'un artiste (les pistes affichent désormais leur jaquette d'album respective au lieu de la photo de profil de l'artiste)."
    ],
    "1.4.7": [
        "Correction de l'onboarding bloqué quand Spotify est saturé (les artistes locaux sont désormais acceptés pour créer les recommandations).",
        "Ajout des vraies photos de profil Spotify pour tous les artistes de secours (Maes, Ninho, SCH, Damso, Gazo, Tiakola, Drake, The Weeknd, etc.)."
    ],
    "1.4.6": [
        "Résilience accrue pour les profils d'artistes et la recherche (toutes les requêtes d'artistes en erreur ou bloquées basculent de façon transparente vers les données de secours locales)."
    ],
    "1.4.5": [
        "Gestion résiliente des limitations Spotify (si l'API de recherche Spotify est saturée ou bloquée par un code 429, NeonWave bascule automatiquement sur la recherche locale hors-ligne)."
    ],
    "1.4.4": [
        "Résolution automatique des conflits de port réseau (si le port 5000 est déjà occupé par une autre application, NeonWave choisit automatiquement le port disponible suivant)."
    ],
    "1.4.3": [
        "Résolution automatique des flux audio (plus besoin d'avoir Python ou yt-dlp installé localement).",
        "Fonctionnement hors-ligne et résilience des Recommandations et du Top du Moment (en cas de panne de Spotify).",
        "Affichage des photos réelles des artistes Spotify dans le bilan hebdomadaire.",
        "Transition fluide et progressive (effet Reveal) lors du déverrouillage du bilan.",
        "Remplacement des placeholders textuels 'NW' par les logos officiels de NeonWave.",
        "Ajout de cet écran de bienvenue présentant les nouveautés après chaque mise à jour."
    ]
};
