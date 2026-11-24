import { createBrowserRouter } from 'react-router'
import { Loading } from '../components/ui'
import { LoginPage } from '../features/auth/LoginPage'
import { PlayerCardPage } from '../features/player/PlayerCardPage'
import { RequireAuth } from './RequireAuth'
import { AppLayout } from './AppLayout'
import { ErrorPage } from './ErrorPage'
import { NotFoundPage } from './NotFoundPage'
import { routePatterns } from './paths'

// The start page and the login load with the app; every other page is its own chunk, fetched on
// first visit (lists, dictation and scan, debug view, trainer area). Opened directly, they show
// the loading screen until their chunk is there.
export const router = createBrowserRouter([
  { path: routePatterns.login, element: <LoginPage />, errorElement: <ErrorPage /> },
  {
    path: routePatterns.trainerJoin,
    lazy: async () => ({ Component: (await import('../features/trainer/TrainerPages')).JoinTeamPage }),
    hydrateFallbackElement: <Loading />,
    errorElement: <ErrorPage />,
  },
  {
    element: <RequireAuth />,
    hydrateFallbackElement: <Loading />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <PlayerCardPage /> },
          {
            path: routePatterns.wordLists,
            lazy: async () => ({ Component: (await import('../features/dictation/WordListsPage')).WordListsPage }),
          },
          {
            path: routePatterns.newWordList,
            lazy: async () => ({ Component: (await import('../features/dictation/WordListEditorPage')).WordListEditorPage }),
          },
          {
            path: routePatterns.wordList,
            lazy: async () => ({ Component: (await import('../features/dictation/WordListEditorPage')).WordListEditorPage }),
          },
          {
            path: routePatterns.training,
            lazy: async () => ({ Component: (await import('../features/player/TrainingPage')).TrainingPage }),
          },
          {
            path: routePatterns.round,
            lazy: async () => ({ Component: (await import('../features/dictation/RoundPage')).RoundPage }),
          },
          // Debug view: what the AI reads on any sheet (no app logic, nothing stored)
          {
            path: routePatterns.debugScan,
            lazy: async () => ({ Component: (await import('../features/debug/ScanDebugPage')).ScanDebugPage }),
          },
          {
            path: routePatterns.trainer,
            lazy: async () => ({ Component: (await import('../features/trainer/TrainerPages')).TrainerPinPage }),
          },
          {
            path: routePatterns.trainerArea,
            lazy: async () => ({ Component: (await import('../features/trainer/TrainerPages')).TrainerAreaPage }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
