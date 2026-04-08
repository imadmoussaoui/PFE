import { useState } from 'react';

const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Status', href: '#status' },
    { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl backdrop-saturate-150">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <a href="#home" className="flex items-center gap-3 text-slate-900">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-lg font-semibold text-white shadow-sm">
                        PFE
                    </div>
                    <div>
                        <p className="text-lg font-semibold">My PFE</p>
                        <p className="text-sm text-slate-500">MERN dashboard</p>
                    </div>
                </a>

                <nav className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    <a
                        href="#contact"
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        Contact
                    </a>
                    <a
                        href="#status"
                        className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                    >
                        Get Started
                    </a>
                </div>

                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 md:hidden"
                    aria-label="Toggle navigation"
                    onClick={() => setIsOpen((open) => !open)}
                >
                    <span className="sr-only">Toggle menu</span>
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
                    <div className="space-y-3">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <a
                            href="#contact"
                            className="block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Contact
                        </a>
                    </div>
                </div>
            ) : null}
        </header>
    );
}
