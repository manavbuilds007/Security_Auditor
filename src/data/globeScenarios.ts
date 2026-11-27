/** Where a pin's label sits relative to the pin, so neighbouring labels (Mumbai/Bengaluru) never collide. */
export type LabelSide = 'ne' | 'nw' | 'se' | 'sw';

export interface Hotspot {
  city: string;
  lat: number;
  lon: number;
  label: LabelSide;
}

export interface Scenario {
  id: 'india' | 'north-america' | 'europe';
  region: string;
  cities: Hotspot[];
  /** What goes wrong when raw documents leave the browser. */
  leak: string;
  /** What PII Sanitizer does about it. */
  outcome: string;
}

/** Illustrative scenarios, not reports of real incidents. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'india',
    region: 'India',
    cities: [
      { city: 'Bengaluru', lat: 12.97, lon: 77.59, label: 'se' },
      { city: 'Mumbai', lat: 19.08, lon: 72.88, label: 'nw' },
    ],
    leak: 'Unmasked KYC logs and PAN / national ID spreadsheets pasted into external AI tools.',
    outcome: 'Blocked locally before upload.',
  },
  {
    id: 'north-america',
    region: 'North America',
    cities: [
      { city: 'San Francisco', lat: 37.77, lon: -122.42, label: 'nw' },
      { city: 'New York', lat: 40.71, lon: -74.01, label: 'ne' },
    ],
    leak: 'Customer support tickets with raw credit card numbers and emails shared with third-party vendors.',
    outcome: 'Filtered via Luhn & masked in-browser.',
  },
  {
    id: 'europe',
    region: 'Europe',
    cities: [
      { city: 'Frankfurt', lat: 50.11, lon: 8.68, label: 'ne' },
      { city: 'London', lat: 51.51, lon: -0.13, label: 'sw' },
    ],
    leak: 'Production server logs leaking customer IPv4/IPv6 addresses and phone numbers.',
    outcome: 'Pseudonymized consistently (USER_01, IP_01) for safe debugging.',
  },
];

/** Where the camera should look for a scenario: the midpoint of its cities, tilted to stay readable. */
export function cameraFor(s: Scenario): { lat: number; lon: number } {
  const lat = s.cities.reduce((a, c) => a + c.lat, 0) / s.cities.length;
  const lon = s.cities.reduce((a, c) => a + c.lon, 0) / s.cities.length;
  return { lat: Math.max(10, Math.min(36, lat)), lon };
}
