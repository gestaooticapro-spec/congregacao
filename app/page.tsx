import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-4xl flex-col items-center text-center px-6 py-12">
        <div className="mb-12">
          <Image
            className="dark:invert mb-8 mx-auto"
            src="/next.svg"
            alt="Next.js logo"
            width={120}
            height={24}
            priority
          />
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
            Congregation Manager
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
            Uma plataforma moderna e eficiente para gerenciar as atividades da sua congregação.
            Organize membros, grupos de serviço, escalas de limpeza e muito mais em um só lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mb-16">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 transition-all hover:scale-[1.02]">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Membros</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Gerencie o cadastro de todos os membros e suas qualificações.</p>
            <a href="/admin/membros" className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">Acessar</a>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 transition-all hover:scale-[1.02]">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Programação</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Visualize e organize as reuniões e designações semanais.</p>
            <a href="/programacao" className="inline-block px-6 py-2 bg-secondary text-white rounded-lg font-bold hover:bg-slate-700 transition-colors">Ver Escalas</a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-white px-8 text-white dark:text-slate-900 font-bold transition-all hover:bg-slate-800 dark:hover:bg-slate-100 shadow-lg"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentação
          </a>
          <a
            className="flex h-12 items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-800 px-8 text-slate-600 dark:text-slate-400 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
            href="https://vercel.com/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            Deploy Now
          </a>
        </div>
      </main>
    </div>
  );
}
