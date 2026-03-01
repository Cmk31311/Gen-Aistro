export const TABS = {
  SEARCH: 'search',
  GRAPH: 'graph',
  ANALYTICS: 'analytics',
  INSIGHTS: 'insights'
};

export const TAB_LABELS = {
  SEARCH: 'Search',
  GRAPH: 'Publications',
  ANALYTICS: 'Analytics',
  INSIGHTS: 'Insights'
};

export const TAB_ICONS = {
  SEARCH: '\uD83D\uDD0D',
  GRAPH: '\uD83D\uDCDA',
  ANALYTICS: '\uD83D\uDCCA',
  INSIGHTS: '\uD83D\uDCA1'
};

export const ORGANISMS = [
  'Arabidopsis',
  'Mouse',
  'Rat',
  'Human',
  'Plant',
  'Drosophila',
  'Zebrafish',
  'C. elegans',
  'Yeast',
  'Bacteria'
];

export const ORGANISM_PATTERNS = {
  'Arabidopsis': /arabidopsis/i,
  'Mouse': /\b(mouse|mice|mus\b)/i,
  'Rat': /\brats?\b/i,
  'Human': /\bhuman/i,
  'Plant': /\bplant/i,
  'Drosophila': /drosophila/i,
  'Zebrafish': /zebrafish/i,
  'C. elegans': /c\.?\s*elegans/i,
  'Yeast': /\byeast|saccharomyces/i,
  'Bacteria': /\bbacteri|salmonella|e\.?\s*coli/i
};

export const EXAMPLE_QUESTIONS = [
  "What are the effects of microgravity on plant growth?",
  "How does space radiation affect human cells?",
  "What research has been done on bone loss in space?",
  "How do plants adapt to spaceflight conditions?"
];

export const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Focus search', alt: ['/'] },
  { keys: ['1'], description: 'Search tab' },
  { keys: ['2'], description: 'Publications tab' },
  { keys: ['3'], description: 'Analytics tab' },
  { keys: ['4'], description: 'Insights tab' },
  { keys: ['Ctrl', 'B'], description: 'Toggle bookmarks' },
  { keys: ['Esc'], description: 'Close modals' },
  { keys: ['?'], description: 'Show shortcuts' }
];
