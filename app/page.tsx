export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-zinc-950">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        🍽️ Meal Planner
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        The week calendar will live here. For now, start by filling your{" "}
        <a href="/meals" className="font-medium underline">
          Meal Library
        </a>
        .
      </p>
    </main>
  );
}
