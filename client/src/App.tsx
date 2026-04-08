import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';

export default function App() {
  const [serverStatus, setServerStatus] = useState<string>('Checking...');

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/health`);
        const data = await response.json();
        setServerStatus(`Server is ${data.status}`);
      } catch (error) {
        setServerStatus('Server not reachable');
      }
    };

    checkServer();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
        <section id="home" className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              Tailwind + React
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Build a modern navbar with Tailwind CSS.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              This responsive navigation bar is designed for desktop and mobile, using clean Tailwind utilities and a polished brand presentation.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <a href="#status" className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto">
                View server status
              </a>
              <a href="#features" className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 sm:w-auto">
                Explore features
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Server health</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  Online
                </span>
              </div>
              <div className="rounded-3xl bg-slate-950 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">API status</p>
                <p className="mt-4 text-3xl font-semibold">{serverStatus}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  This section updates from the server health endpoint in the backend.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Fast setup',
              description: 'Tailwind and Vite configure quickly so you can focus on building features.',
            },
            {
              title: 'Responsive UI',
              description: 'A responsive navbar and layout that looks great on desktop and mobile.',
            },
            {
              title: 'Clean code',
              description: 'A minimal design with well-structured React components and Tailwind utilities.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
