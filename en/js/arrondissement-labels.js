// Shared English labels for Paris arrondissements + the three neighboring
// départements that show up in some datasets (bread competition entrants
// from Greater Paris). Import this everywhere an arrondissement needs an
// English label instead of duplicating the table per file.

const ARRONDISSEMENT_LABELS = {
  '1er': '1st arrondissement',
  '2e': '2nd arrondissement',
  '3e': '3rd arrondissement',
  '4e': '4th arrondissement',
  '5e': '5th arrondissement',
  '6e': '6th arrondissement',
  '7e': '7th arrondissement',
  '8e': '8th arrondissement',
  '9e': '9th arrondissement',
  '10e': '10th arrondissement',
  '11e': '11th arrondissement',
  '12e': '12th arrondissement',
  '13e': '13th arrondissement',
  '14e': '14th arrondissement',
  '15e': '15th arrondissement',
  '16e': '16th arrondissement',
  '17e': '17th arrondissement',
  '18e': '18th arrondissement',
  '19e': '19th arrondissement',
  '20e': '20th arrondissement',
  'Hauts-de-Seine': 'Hauts-de-Seine (just outside Paris)',
  'Seine-Saint-Denis': 'Seine-Saint-Denis (just outside Paris)',
  'Val-de-Marne': 'Val-de-Marne (just outside Paris)'
};

export function arrondissementLabel(arr) {
  return ARRONDISSEMENT_LABELS[arr] ?? arr;
}
