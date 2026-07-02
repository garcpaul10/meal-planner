export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-zinc-950">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        🍽️ Meal Planner
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Scaffold complete — week calendar coming soon.
      </p>
      <p className="rounded-full bg-zinc-200 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        Next.js · Prisma · Tailwind · dnd-kit
      </p>
    </main>
  );
}
