import Image from "next/image";
import HomeMemberSearch from "@/components/home/HomeMemberSearch";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-4xl flex-col items-center text-center px-6 py-12">
        <div className="mb-12 w-full">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Congregation Manager
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Consulte suas designações e escalas rapidamente.
            </p>
          </div>

          <HomeMemberSearch />
        </div>

        {/* Removed Admin/Programação cards and Footer links as requested */}
      </main>
    </div>
  );
}
