/**
 * Cities for working out Maghrib and Asr (approximate coordinates are
 * plenty for prayer times). People can also use their phone's location.
 */
export type City = { city: string; country: string; latitude: number; longitude: number };

export const CITIES: City[] = [
  // Morocco
  { city: 'Casablanca', country: 'Morocco', latitude: 33.57, longitude: -7.59 },
  { city: 'Rabat', country: 'Morocco', latitude: 34.02, longitude: -6.84 },
  { city: 'Marrakech', country: 'Morocco', latitude: 31.63, longitude: -8.0 },
  { city: 'Fes', country: 'Morocco', latitude: 34.03, longitude: -5.0 },
  { city: 'Tangier', country: 'Morocco', latitude: 35.76, longitude: -5.83 },
  { city: 'Agadir', country: 'Morocco', latitude: 30.43, longitude: -9.6 },
  { city: 'Meknes', country: 'Morocco', latitude: 33.9, longitude: -5.55 },
  { city: 'Oujda', country: 'Morocco', latitude: 34.68, longitude: -1.91 },
  { city: 'Tetouan', country: 'Morocco', latitude: 35.57, longitude: -5.37 },
  // North Africa & Middle East
  { city: 'Algiers', country: 'Algeria', latitude: 36.75, longitude: 3.06 },
  { city: 'Tunis', country: 'Tunisia', latitude: 36.81, longitude: 10.18 },
  { city: 'Cairo', country: 'Egypt', latitude: 30.04, longitude: 31.24 },
  { city: 'Makkah', country: 'Saudi Arabia', latitude: 21.42, longitude: 39.83 },
  { city: 'Madinah', country: 'Saudi Arabia', latitude: 24.47, longitude: 39.61 },
  { city: 'Riyadh', country: 'Saudi Arabia', latitude: 24.71, longitude: 46.68 },
  { city: 'Jeddah', country: 'Saudi Arabia', latitude: 21.49, longitude: 39.19 },
  { city: 'Dubai', country: 'UAE', latitude: 25.2, longitude: 55.27 },
  { city: 'Abu Dhabi', country: 'UAE', latitude: 24.45, longitude: 54.38 },
  { city: 'Doha', country: 'Qatar', latitude: 25.29, longitude: 51.53 },
  { city: 'Kuwait City', country: 'Kuwait', latitude: 29.38, longitude: 47.99 },
  { city: 'Amman', country: 'Jordan', latitude: 31.95, longitude: 35.93 },
  { city: 'Istanbul', country: 'Türkiye', latitude: 41.01, longitude: 28.98 },
  // Europe
  { city: 'London', country: 'United Kingdom', latitude: 51.51, longitude: -0.13 },
  { city: 'Birmingham', country: 'United Kingdom', latitude: 52.49, longitude: -1.89 },
  { city: 'Manchester', country: 'United Kingdom', latitude: 53.48, longitude: -2.24 },
  { city: 'Paris', country: 'France', latitude: 48.86, longitude: 2.35 },
  { city: 'Marseille', country: 'France', latitude: 43.3, longitude: 5.37 },
  { city: 'Lyon', country: 'France', latitude: 45.76, longitude: 4.84 },
  { city: 'Brussels', country: 'Belgium', latitude: 50.85, longitude: 4.35 },
  { city: 'Antwerp', country: 'Belgium', latitude: 51.22, longitude: 4.4 },
  { city: 'Amsterdam', country: 'Netherlands', latitude: 52.37, longitude: 4.9 },
  { city: 'Rotterdam', country: 'Netherlands', latitude: 51.92, longitude: 4.48 },
  { city: 'Madrid', country: 'Spain', latitude: 40.42, longitude: -3.7 },
  { city: 'Barcelona', country: 'Spain', latitude: 41.39, longitude: 2.17 },
  { city: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.4 },
  { city: 'Frankfurt', country: 'Germany', latitude: 50.11, longitude: 8.68 },
  { city: 'Milan', country: 'Italy', latitude: 45.46, longitude: 9.19 },
  { city: 'Rome', country: 'Italy', latitude: 41.9, longitude: 12.5 },
  { city: 'Stockholm', country: 'Sweden', latitude: 59.33, longitude: 18.07 },
  // Americas
  { city: 'New York', country: 'United States', latitude: 40.71, longitude: -74.01 },
  { city: 'Chicago', country: 'United States', latitude: 41.88, longitude: -87.63 },
  { city: 'Houston', country: 'United States', latitude: 29.76, longitude: -95.37 },
  { city: 'Los Angeles', country: 'United States', latitude: 34.05, longitude: -118.24 },
  { city: 'Dearborn', country: 'United States', latitude: 42.32, longitude: -83.18 },
  { city: 'Toronto', country: 'Canada', latitude: 43.65, longitude: -79.38 },
  { city: 'Montreal', country: 'Canada', latitude: 45.5, longitude: -73.57 },
  // Asia & Oceania
  { city: 'Karachi', country: 'Pakistan', latitude: 24.86, longitude: 67.0 },
  { city: 'Lahore', country: 'Pakistan', latitude: 31.55, longitude: 74.34 },
  { city: 'Dhaka', country: 'Bangladesh', latitude: 23.81, longitude: 90.41 },
  { city: 'Delhi', country: 'India', latitude: 28.61, longitude: 77.21 },
  { city: 'Jakarta', country: 'Indonesia', latitude: -6.2, longitude: 106.85 },
  { city: 'Kuala Lumpur', country: 'Malaysia', latitude: 3.14, longitude: 101.69 },
  { city: 'Singapore', country: 'Singapore', latitude: 1.35, longitude: 103.82 },
  { city: 'Sydney', country: 'Australia', latitude: -33.87, longitude: 151.21 },
  { city: 'Melbourne', country: 'Australia', latitude: -37.81, longitude: 144.96 },
  // Sub-Saharan Africa
  { city: 'Dakar', country: 'Senegal', latitude: 14.72, longitude: -17.47 },
  { city: 'Lagos', country: 'Nigeria', latitude: 6.52, longitude: 3.38 },
  { city: 'Nairobi', country: 'Kenya', latitude: -1.29, longitude: 36.82 },
  { city: 'Johannesburg', country: 'South Africa', latitude: -26.2, longitude: 28.05 },
];
