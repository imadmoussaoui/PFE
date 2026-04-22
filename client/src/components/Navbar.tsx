import { useState } from 'react';

const navLinks = [
    { label: 'Accueil', href: '#home' },
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Statut', href: '#status' },
];

export default function Navbar({ onContactClick, onLoginClick, onHomeClick }: { onContactClick: () => void; onLoginClick: () => void; onHomeClick: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl backdrop-saturate-150">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <button onClick={onHomeClick} className="cursor-pointer flex items-center gap-3 text-slate-900">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-lg font-semibold">BricolPro</p>
                        <p className="text-sm text-slate-500">Plateforme de bricolage</p>
                    </div>
                </button>

                <nav className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        link.label === 'Accueil' ? (
                            <button
                                key={link.href}
                                onClick={onHomeClick}
                                className="cursor-pointer text-sm font-medium text-slate-600 transition hover:text-slate-900"
                            >
                                {link.label}
                            </button>
                        ) : (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                            >
                                {link.label}
                            </a>
                        )
                    ))}
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 pl-10 text-sm text-slate-900 placeholder-slate-500 transition hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </div>
                </div>

                <div className="hidden items-center gap-3 md:flex">
                    <button
                        type="button"
                        onClick={onContactClick}
                        className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        Contact
                    </button>
                    <button
                        type="button"
                        onClick={onLoginClick}
                        className="cursor-pointer rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                    >
                        Connexion
                    </button>
                </div>

                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 md:hidden"
                    aria-label="Basculer la navigation"
                    onClick={() => setIsOpen((open) => !open)}
                >
                    <span className="sr-only">Basculer le menu</span>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isOpen ? (
                            <path d="M18 6L6 18M6 6l12 12" />
                        ) : (
                            <>
                                <path d="M4 7h16" />
                                <path d="M4 12h16" />
                                <path d="M4 17h16" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {isOpen ? (
                <div className="md:hidden border-t border-slate-200 bg-white/95 px-6 pb-6 pt-4">
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 pl-10 text-sm text-slate-900 placeholder-slate-500 transition hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </div>
                    <div className="space-y-3">
                        {navLinks.map((link) => (
                            link.label === 'Accueil' ? (
                                <button
                                    key={link.href}
                                    onClick={() => {
                                        onHomeClick();
                                        setIsOpen(false);
                                    }}
                                    className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                    {link.label}
                                </button>
                            ) : (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.label}
                                </a>
                            )
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                onContactClick();
                                setIsOpen(false);
                            }}
                            className="block w-full rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Contact
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onLoginClick();
                                setIsOpen(false);
                            }}
                            className="block w-full rounded-2xl border border-sky-600 bg-sky-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-sky-700"
                        >
                            Login
                        </button>
                    </div>
                </div>
            ) : null}
        </header>
    );
}
