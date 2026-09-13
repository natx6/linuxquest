import { useParams, Link } from 'react-router-dom';
import BottomNav from '../components/ui/BottomNav';

export default function Lesson() {
  const { id } = useParams();
  return (
    <main className="min-h-dvh max-w-app mx-auto px-4 pt-4 pb-24">
      <p className="text-xs text-text-muted mb-2">
        Basics › <span className="text-accent-cyan font-mono">{id}</span>
      </p>
      <h1 className="font-semibold text-lg mb-2">Lesson {id}</h1>
      <p className="text-sm text-text-muted mb-4">
        Terminal + validator land in steps 4–6. This is a route placeholder so navigation can be
        reviewed now.
      </p>
      <Link to="/" className="text-accent-cyan text-sm">
        ← Back to Hub
      </Link>
      <BottomNav />
    </main>
  );
}
