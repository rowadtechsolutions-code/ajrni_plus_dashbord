export interface Brand {
  id: string;
  label: string;
  logo: string;
  color: string;
}

export const brands: Brand[] = [
  { id: 'toyota', label: 'Toyota', logo: 'https://cdn.simpleicons.org/toyota/e30613', color: '#e30613' },
  { id: 'honda', label: 'Honda', logo: 'https://cdn.simpleicons.org/honda/1a5e9c', color: '#1a5e9c' },
  { id: 'nissan', label: 'Nissan', logo: 'https://cdn.simpleicons.org/nissan/c32032', color: '#c32032' },
  { id: 'hyundai', label: 'Hyundai', logo: 'https://cdn.simpleicons.org/hyundai/003366', color: '#003366' },
  { id: 'kia', label: 'Kia', logo: 'https://cdn.simpleicons.org/kia/bb162b', color: '#bb162b' },
  { id: 'mercedes', label: 'Mercedes', logo: 'https://cdn.simpleicons.org/mercedes/242424', color: '#242424' },
  { id: 'bmw', label: 'BMW', logo: 'https://cdn.simpleicons.org/bmw/0066b1', color: '#0066b1' },
  { id: 'audi', label: 'Audi', logo: 'https://cdn.simpleicons.org/audi/000000', color: '#000000' },
  { id: 'ford', label: 'Ford', logo: 'https://cdn.simpleicons.org/ford/003478', color: '#003478' },
  { id: 'chevrolet', label: 'Chevrolet', logo: 'https://cdn.simpleicons.org/chevrolet/c2a53a', color: '#c2a53a' },
  { id: 'lexus', label: 'Lexus', logo: 'https://cdn.simpleicons.org/lexus/113743', color: '#113743' },
  { id: 'mazda', label: 'Mazda', logo: 'https://cdn.simpleicons.org/mazda/972432', color: '#972432' },
  { id: 'mg', label: 'MG', logo: 'https://cdn.simpleicons.org/mg/c8102e', color: '#c8102e' },
  { id: 'changan', label: 'Changan', logo: 'https://cdn.simpleicons.org/changan/003d7a', color: '#003d7a' },
  { id: 'geely', label: 'Geely', logo: 'https://cdn.simpleicons.org/geely/002c5f', color: '#002c5f' },
  { id: 'gac', label: 'GAC', logo: 'https://cdn.simpleicons.org/gac/c60c30', color: '#c60c30' },
];

export const brandModels: Record<string, string[]> = {
  toyota: ['Camry', 'Corolla', 'Yaris', 'RAV4', 'Land Cruiser', 'Prado', 'Hilux', 'Fortuner', 'Avalon', 'C-HR', 'Supra', 'Highlander'],
  honda: ['Civic', 'Accord', 'City', 'CR-V', 'HR-V', 'Pilot', 'Odyssey', 'Fit', 'Insight'],
  nissan: ['Altima', 'Sentra', 'Sunny', 'Pathfinder', 'Xterra', 'Patrol', 'Kicks', 'Qashqai', 'Maxima', 'Frontier'],
  hyundai: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Veloster', 'Kona', 'Palisade', 'IONIQ'],
  kia: ['Optima', 'Sportage', 'Sorento', 'Rio', 'Soul', 'Telluride', 'Stinger', 'Carnival', 'Cerato', 'Picanto'],
  mercedes: ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'GLS', 'A-Class', 'CLA', 'G-Class', 'AMG GT', 'EQB', 'EQS'],
  bmw: ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', 'X1', 'X6', 'Z4', 'i4', 'iX', 'M3', 'M5'],
  audi: ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'TT', 'R8'],
  ford: ['Focus', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Ranger', 'F-150', 'Bronco'],
  chevrolet: ['Malibu', 'Silverado', 'Tahoe', 'Suburban', 'Traverse', 'Equinox', 'Camaro', 'Corvette', 'Trailblazer'],
  lexus: ['ES', 'IS', 'LS', 'RX', 'NX', 'LX', 'UX', 'GX', 'LC'],
  mazda: ['Mazda3', 'Mazda6', 'CX-5', 'CX-30', 'CX-9', 'MX-5', 'BT-50'],
  mg: ['MG5', 'MG6', 'ZS', 'HS', 'RX5', 'MG3'],
  changan: ['CS35', 'CS55', 'CS75', 'CS95', 'Eado', 'UNI-T', 'UNI-V', 'UNI-K'],
  geely: ['Emgrand', 'Coolray', 'Azkarra', 'Monjaro', 'Tugella', 'Okavango', 'Icon', 'Geometry'],
  gac: ['GS3', 'GS4', 'GS5', 'GS8', 'GN6', 'GA4', 'GA6', 'Empow', 'Aion S'],
};
