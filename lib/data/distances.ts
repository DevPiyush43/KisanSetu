/** Hardcoded distance matrix (km) between supported districts */
export const DISTANCE_KM: Record<string, Record<string, number>> = {
  Indore:  { Indore: 0,   Bhopal: 195, Nagpur: 520, Pune: 580,  Jaipur: 590 },
  Bhopal:  { Indore: 195, Bhopal: 0,   Nagpur: 345, Pune: 790,  Jaipur: 480 },
  Nagpur:  { Indore: 520, Bhopal: 345, Nagpur: 0,   Pune: 250,  Jaipur: 820 },
  Pune:    { Indore: 580, Bhopal: 790, Nagpur: 250, Pune: 0,    Jaipur: 1150 },
  Jaipur:  { Indore: 590, Bhopal: 480, Nagpur: 820, Pune: 1150, Jaipur: 0 },
}

/** Get straight-line road distance between two districts (km) */
export function getDistance(from: string, to: string): number {
  return DISTANCE_KM[from]?.[to] ?? DISTANCE_KM[to]?.[from] ?? 500
}
