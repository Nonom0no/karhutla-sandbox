// src/scene/theme.ts - Visual theme constants for the 3D diorama

export const theme = {
  // Ground colors per region (matching fuel grid types)
  groundColors: {
    tropical_rainforest: 0x1b5e20, // dark green
    dry_forest: 0x8d6e63, // brownish
    grassland: 0x66bb6a, // light green
    water: 0x1565c0, // blue for water cells
    edge: 0x212121, // dark edge
  },

  // Tree colors per region
  treeColors: {
    tropical_rainforest: [0x0d4715, 0x1b5e20, 0x2e7d32],
    dry_forest: [0x5d4037, 0x6d4c41, 0x795548],
    grassland: [0x388e3c, 0x43a047, 0x4caf50],
  },

  // Grass colors per region
  grassColors: {
    tropical_rainforest: [0x2e7d32, 0x388e3c],
    dry_forest: [0x8d6e63, 0xa1887f],
    grassland: [0x66bb6a, 0x81c784],
  },

  // Water color
  waterColor: 0x1565c0,

  // Fire colors
  fireColors: {
    intense: 0xff4500, // orange-red
    medium: 0xff8c00, // orange
    low: 0xffd700, // gold/yellow
    ember: 0x8b4513, // brown
  },

  // Sky/background
  backgroundColor: 0x87ceeb, // sky blue

  // Lighting
  ambientLightColor: 0xffffff,
  ambientLightIntensity: 0.6,
  directionalLightColor: 0xffffff,
  directionalLightIntensity: 0.8,
  directionalLightPosition: [100, 200, 100] as [number, number, number],

  // Ground plane size (200 cells * 30m = 6000m, but we scale for visual)
  groundSize: 200, // world units (1 unit = 1 cell)
  groundSegments: 1, // single quad, we use vertex colors or texture later

  // Camera
  cameraPosition: [100, 150, 100] as [number, number, number],
  cameraFov: 60,
  cameraNear: 1,
  cameraFar: 1000,

  // Performance
  maxFlames: 5000,
  maxTrees: 50000,
  maxGrass: 100000,
};