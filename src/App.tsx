import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Hub from './pages/Hub';
import Lesson from './pages/Lesson';
import SkillTree from './pages/SkillTree';
import Stats from './pages/Stats';
import { useUserStore } from './store/userStore';
import { useProgressStore } from './store/progressStore';

function RequireOnboarded({ children }: { children: JSX.Element }) {
  const onboarded = useUserStore((s) => s.onboarded);
  const location = useLocation();
  if (!onboarded) return <Navigate to="/onboarding" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  const hydrateUser = useUserStore((s) => s.hydrate);
  const hydrateProgress = useProgressStore((s) => s.hydrate);

  useEffect(() => {
    hydrateUser();
    hydrateProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-text font-sans dark">
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            <RequireOnboarded>
              <Hub />
            </RequireOnboarded>
          }
        />
        <Route
          path="/lesson/:id"
          element={
            <RequireOnboarded>
              <Lesson />
            </RequireOnboarded>
          }
        />
        <Route
          path="/tree"
          element={
            <RequireOnboarded>
              <SkillTree />
            </RequireOnboarded>
          }
        />
        <Route
          path="/stats"
          element={
            <RequireOnboarded>
              <Stats />
            </RequireOnboarded>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
