import { generatePath } from 'react-router'

export const routePatterns = {
  home: '/',
  login: '/login',
  wordLists: '/dictation',
  newWordList: '/dictation/lists/new',
  wordList: '/dictation/lists/:listId',
  round: '/dictation/rounds/:roundId',
  training: '/training/:listId',
  debugScan: '/debug/scan',
  trainer: '/trainer',
  trainerArea: '/trainer/manage',
  trainerJoin: '/trainer/join',
} as const

export const paths = {
  ...routePatterns,
  wordList: (listId: string) => generatePath(routePatterns.wordList, { listId }),
  round: (roundId: string) => generatePath(routePatterns.round, { roundId }),
  training: (listId: string) => generatePath(routePatterns.training, { listId }),
} as const
