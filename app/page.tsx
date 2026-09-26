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
                <span className="md:hidden">Congregação Guaira</span>
                <span className="hidden md:inline">Gestor Congregação Guaira</span>
              </h1>
              {zoomMeetingUrl && (
                <>
                <a
                  href={zoomMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Entrar na reunião pelo Zoom"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2D8CFF] px-3 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition hover:bg-[#1677e8] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M4.5 7.25h8A3.5 3.5 0 0 1 16 10.75v2.5a3.5 3.5 0 0 1-3.5 3.5h-8A3.5 3.5 0 0 1 1 13.25v-2.5a3.5 3.5 0 0 1 3.5-3.5Zm12.75 3.1 3.4-2.15A1.5 1.5 0 0 1 23 9.47v5.06a1.5 1.5 0 0 1-2.35 1.27l-3.4-2.15v-3.3Z" />
                  </svg>
                  Entrar no Zoom
                </a>
                <a
                  href={"https://wa.me/?text=" + encodeURIComponent("Entre na reunião pelo Zoom: " + zoomMeetingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Enviar link da reunião pelo WhatsApp"
                  title="Enviar link da reunião pelo WhatsApp"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition hover:bg-[#1fb855] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .16 5.34.16 11.91c0 2.1.55 4.15 1.59 5.96L.06 24l6.28-1.65a11.9 11.9 0 0 0 5.72 1.46h.01c6.56 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.46-8.42ZM12.07 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.73.98 1-3.64-.24-.37a9.87 9.87 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.91-9.9a9.82 9.82 0 0 1 7.01 2.91 9.82 9.82 0 0 1 2.9 7.02c0 5.47-4.45 9.91-9.92 9.91Zm5.43-7.42c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.48.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
                  </svg>
                  Compartilhar
                </a>
                </>
              )}
            </div>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full mt-2" />
          </div>

          <HomeMemberSearch />

          <HomeEvents />
        </div>
      </main>
    </div>
  );
}
