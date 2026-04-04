export const BACKGROUND_THEMES = {

  // ── Neutral ────────────────────────────────────────────────────────────────
  default: {
    name: 'Default (Dark)',
    css: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
  },

  // ── Poké Balls ─────────────────────────────────────────────────────────────
  pokeball: {
    name: 'Pokéball',
    css: 'linear-gradient(160deg, #c62828 0%, #ef5350 35%, #1c1c1c 36%, #1c1c1c 64%, #f5f5f5 65%, #bdbdbd 100%)',
  },
  greatball: {
    name: 'Great Ball',
    css: 'linear-gradient(160deg, #1565c0 0%, #1976d2 38%, #111827 39%, #111827 61%, #c62828 62%, #ef5350 100%)',
  },
  ultraball: {
    name: 'Ultra Ball',
    css: 'linear-gradient(160deg, #f9a825 0%, #fdd835 30%, #111111 31%, #111111 69%, #fdd835 70%, #f57f17 100%)',
  },
  masterball: {
    name: 'Master Ball',
    css: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 25%, #9c27b0 50%, #e91e63 75%, #f06292 100%)',
  },
  premierball: {
    name: 'Premier Ball',
    css: 'linear-gradient(160deg, #f5f5f5 0%, #e0e0e0 38%, #212121 39%, #212121 61%, #ef5350 62%, #c62828 100%)',
  },
  lureball: {
    name: 'Lure Ball',
    css: 'linear-gradient(135deg, #0277bd 0%, #039be5 30%, #4fc3f7 55%, #0288d1 80%, #01579b 100%)',
  },
  duskball: {
    name: 'Dusk Ball',
    css: 'linear-gradient(135deg, #1b1b2f 0%, #2d2d44 25%, #4a3728 55%, #2c1810 80%, #0d0d0d 100%)',
  },
  healball: {
    name: 'Heal Ball',
    css: 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 30%, #e91e63 55%, #ad1457 80%, #880e4f 100%)',
  },

  // ── Pokémon Types ──────────────────────────────────────────────────────────
  grass: {
    name: 'Grass Type',
    css: 'linear-gradient(135deg, #033a16 0%, #1b5e20 30%, #2e7d32 60%, #388e3c 85%, #558b2f 100%)',
  },
  fire: {
    name: 'Fire Type',
    css: 'radial-gradient(ellipse at 50% 90%, #ff6f00 0%, #e65100 35%, #bf360c 65%, #3e0000 100%)',
  },
  water: {
    name: 'Water Type',
    css: 'linear-gradient(160deg, #0a2a6e 0%, #0d47a1 30%, #1565c0 55%, #1976d2 75%, #0288d1 100%)',
  },
  electric: {
    name: 'Electric Type',
    css: 'radial-gradient(ellipse at 30% 30%, #fff9c4 0%, #fff176 20%, #fdd835 45%, #f9a825 70%, #1a1200 100%)',
  },
  psychic: {
    name: 'Psychic Type',
    css: 'linear-gradient(135deg, #4a0030 0%, #880e4f 30%, #c2185b 55%, #6a0080 80%, #2d0040 100%)',
  },
  dark: {
    name: 'Dark Type',
    css: 'linear-gradient(160deg, #0d0d0d 0%, #1c1c1c 30%, #212121 55%, #37474f 80%, #263238 100%)',
  },
  dragon: {
    name: 'Dragon Type',
    css: 'linear-gradient(135deg, #0d0d2b 0%, #1a237e 25%, #283593 50%, #4527a0 75%, #6a1b9a 100%)',
  },
  ice: {
    name: 'Ice Type',
    css: 'linear-gradient(160deg, #e0f7fa 0%, #b2ebf2 25%, #4dd0e1 50%, #00bcd4 75%, #006064 100%)',
  },
  fighting: {
    name: 'Fighting Type',
    css: 'linear-gradient(135deg, #3e0000 0%, #bf360c 35%, #d84315 60%, #795548 85%, #4e342e 100%)',
  },
  steel: {
    name: 'Steel Type',
    css: 'linear-gradient(135deg, #37474f 0%, #546e7a 25%, #78909c 50%, #90a4ae 75%, #b0bec5 100%)',
  },
  ghost: {
    name: 'Ghost Type',
    css: 'radial-gradient(ellipse at 50% 40%, #4a148c 0%, #311b92 30%, #1a0a2e 60%, #050510 100%)',
  },
  fairy: {
    name: 'Fairy Type',
    css: 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 25%, #e91e63 50%, #f06292 75%, #fce4ec 100%)',
  },

  // ── Pokémon Locations ──────────────────────────────────────────────────────
  viridian_forest: {
    name: 'Viridian Forest',
    css: 'radial-gradient(ellipse at 20% 20%, #33691e 0%, #558b2f 20%, #1b5e20 50%, #0a2e0a 80%, #050f05 100%)',
  },
  cerulean_city: {
    name: 'Cerulean City',
    css: 'linear-gradient(160deg, #e3f2fd 0%, #90caf9 20%, #42a5f5 45%, #1565c0 70%, #0d47a1 100%)',
  },
  lavender_town: {
    name: 'Lavender Town',
    css: 'radial-gradient(ellipse at 50% 0%, #311b92 0%, #4a148c 30%, #1a0a2e 65%, #050510 100%)',
  },
  cinnabar_island: {
    name: 'Cinnabar Island',
    css: 'radial-gradient(ellipse at 50% 100%, #ff8f00 0%, #e65100 25%, #bf360c 55%, #4a1000 80%, #0d0000 100%)',
  },
  victory_road: {
    name: 'Victory Road',
    css: 'linear-gradient(135deg, #1c1c1c 0%, #37474f 20%, #546e7a 45%, #78909c 70%, #b0bec5 90%, #ffd54f 100%)',
  },
  mt_moon: {
    name: 'Mt. Moon',
    css: 'radial-gradient(ellipse at 50% 50%, #3949ab 0%, #1a237e 35%, #0d1257 65%, #030820 100%)',
  },
  seafoam_islands: {
    name: 'Seafoam Islands',
    css: 'linear-gradient(160deg, #e0f7fa 0%, #b2ebf2 20%, #4dd0e1 45%, #0097a7 70%, #006064 100%)',
  },
  saffron_city: {
    name: 'Saffron City',
    css: 'linear-gradient(135deg, #e65100 0%, #f57f17 25%, #fbc02d 50%, #fff176 75%, #f9a825 100%)',
  },
  ecruteak_city: {
    name: 'Ecruteak City',
    css: 'radial-gradient(ellipse at 70% 30%, #e65100 0%, #bf360c 20%, #4a0e00 45%, #2d0050 70%, #0d0020 100%)',
  },
  ever_grande: {
    name: 'Ever Grande City',
    css: 'linear-gradient(135deg, #1a237e 0%, #4527a0 20%, #7b1fa2 40%, #880e4f 60%, #c62828 80%, #e65100 100%)',
  },
  spear_pillar: {
    name: 'Spear Pillar',
    css: 'radial-gradient(ellipse at 50% 30%, #e8eaf6 0%, #7986cb 20%, #3949ab 45%, #1a237e 65%, #050820 100%)',
  },
  distortion_world: {
    name: 'Distortion World',
    css: 'radial-gradient(ellipse at 30% 70%, #311b92 0%, #1a0a2e 30%, #000000 55%, #1b0033 80%, #0d1257 100%)',
  },

};

export const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY;
