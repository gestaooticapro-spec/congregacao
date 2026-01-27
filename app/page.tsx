import Image from "next/image";
import HomeMemberSearch from "@/components/home/HomeMemberSearch";
import HomeEvents from "@/components/home/HomeEvents";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] justify-center bg-background font-sans pt-4">
      <main className="flex w-full max-w-4xl flex-col items-center text-center px-6">
        <div className="w-full">
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
              Gestor Congregação Guaira
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Programa para organizar as designações da nossa congregação
            </p>
          </div>

          <HomeMemberSearch />

          <HomeEvents />
        </div>
      </main>
    </div>
  );
}
