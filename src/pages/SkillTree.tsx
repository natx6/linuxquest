import BottomNav from '../components/ui/BottomNav';

export default function SkillTree() {
  return (
    <main className="min-h-dvh max-w-app mx-auto px-4 pt-4 pb-24">
      <h1 className="font-semibold text-lg mb-2">Skill Tree</h1>
      <p className="text-sm text-text-muted">
        Full track/node graph + bottom sheet land in step 8. Placeholder for route review.
      </p>
      <BottomNav />
    </main>
  );
}
