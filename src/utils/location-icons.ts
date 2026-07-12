import { Droplets, Utensils, ShoppingCart, Fuel, Cross, TreePine } from 'lucide-react';

export const LOCATION_ICONS = {
  drinkingWater: {
    icon: Droplets,
    emoji: '💧',
    color: '#3B82F6',
    label: 'Drinking Water/Fountains'
  },
  restaurants: {
    icon: Utensils,
    emoji: '🍽️',
    color: '#F59E0B',
    label: 'Restaurants'
  },
  supermarkets: {
    icon: ShoppingCart,
    emoji: '🛒',
    color: '#10B981',
    label: 'Supermarkets/Food Stores'
  },
  gasStations: {
    icon: Fuel,
    emoji: '⛽',
    color: '#EF4444',
    label: 'Gas Stations'
  },
  hospitals: {
    icon: Cross,
    emoji: '🏥',
    color: '#DC2626',
    label: 'Hospitals/Health Centers'
  },
  graveyards: {
    icon: TreePine,
    emoji: '⚰️',
    color: '#6B7280',
    label: 'Graveyards'
  }
} as const;

export const getIconForLocationType = (type: string, category: string) => {
  // Map location types to icon keys
  if (category === 'water' || type === 'fountain' || type === 'well' || type === 'spring' || type === 'tap') {
    return LOCATION_ICONS.drinkingWater;
  }
  if (category === 'food' && (type === 'restaurant' || type === 'supermarket')) {
    return type === 'restaurant' ? LOCATION_ICONS.restaurants : LOCATION_ICONS.supermarkets;
  }
  if (category === 'fuel' || type === 'fuel') {
    return LOCATION_ICONS.gasStations;
  }
  if (category === 'health' || type === 'hospital') {
    return LOCATION_ICONS.hospitals;
  }
  if (type === 'graveyard') {
    return LOCATION_ICONS.graveyards;
  }
  
  // Default fallback
  return LOCATION_ICONS.drinkingWater;
};
