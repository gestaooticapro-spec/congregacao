import Image from "next/image";
import HomeMemberSearch from "@/components/home/HomeMemberSearch";
import HomeEvents from "@/components/home/HomeEvents";

const zoomMeetingUrl = process.env.NEXT_PUBLIC_ZOOM_MEETING_URL;

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] justify-center bg-background font-sans pt-4">
      <main className="flex w-full max-w-4xl flex-col items-center text-center px-6">
        <div className="w-full">
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Gestor Congregação Guaira
              </h1>
              {zoomMeetingUrl && (
                <a
                  href={zoomMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Entrar na reunião pelo Zoom"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2D8CFF] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1677e8] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M4.5 7.25h8A3.5 3.5 0 0 1 16 10.75v2.5a3.5 3.5 0 0 1-3.5 3.5h-8A3.5 3.5 0 0 1 1 13.25v-2.5a3.5 3.5 0 0 1 3.5-3.5Zm12.75 3.1 3.4-2.15A1.5 1.5 0 0 1 23 9.47v5.06a1.5 1.5 0 0 1-2.35 1.27l-3.4-2.15v-3.3Z" />
                  </svg>
                  Entrar no Zoom
                </a>
              )}
            </div>
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
