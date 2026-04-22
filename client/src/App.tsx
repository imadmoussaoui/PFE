import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Contact from './components/Contact';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Annonces from './components/Annonces';
import UserAnnonces from './components/UserAnnonces';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import PublicAnnonces from './components/PublicAnnonces';
import AnnonceDetails from './components/AnnonceDetails';
import HeroCarousel from './components/HeroCarousel';
import LegalPage, { type LegalPageKind } from './components/LegalPage';
import UserProfile from './components/UserProfile';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'contact' | 'login' | 'dashboard' | 'annonces' | 'annonces-post' | 'mes-annonces' | 'admin' | 'annonce-details' | 'user-profile' | LegalPageKind>('home');
  const [selectedAnnonceId, setSelectedAnnonceId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<'home' | 'annonces' | 'annonces-post' | 'mes-annonces' | 'user-profile' | 'annonce-details'>('home');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar
          onContactClick={() => setCurrentPage('contact')}
          onLoginClick={() => setCurrentPage('login')}
          onHomeClick={() => setCurrentPage('home')}
          onDashboardClick={() => setCurrentPage('dashboard')}
          onAnnoncesClick={() => setCurrentPage('annonces')}
          onMesAnnoncesClick={() => setCurrentPage('mes-annonces')}
          onAdminClick={() => setCurrentPage('admin')}
        />

        {currentPage === 'contact' ? (
          <Contact onBack={() => setCurrentPage('home')} />
        ) : currentPage === 'login' ? (
          <Login
            onBack={() => setCurrentPage('home')}
            onLoginSuccess={(user) => {
              if (user.role === 'admin') {
                setCurrentPage('admin');
              } else {
                setCurrentPage('annonces');
              }
            }}
          />
        ) : currentPage === 'dashboard' ? (
          <Dashboard onBack={() => setCurrentPage('home')} />
        ) : currentPage === 'annonces' ? (
          <Annonces
            onBack={() => setCurrentPage('home')}
            onMesAnnonces={() => setCurrentPage('mes-annonces')}
            onOpenAnnonce={(annonceId) => {
              setSelectedAnnonceId(annonceId);
              setPreviousPage('annonces');
              setCurrentPage('annonce-details');
            }}
            onOpenUser={(userId) => {
              setSelectedUserId(userId);
              setPreviousPage('annonces');
              setCurrentPage('user-profile');
            }}
            initialTab="browse"
          />
        ) : currentPage === 'annonces-post' ? (
          <Annonces
            onBack={() => setCurrentPage('home')}
            onMesAnnonces={() => setCurrentPage('mes-annonces')}
            onOpenAnnonce={(annonceId) => {
              setSelectedAnnonceId(annonceId);
              setPreviousPage('annonces-post');
              setCurrentPage('annonce-details');
            }}
            onOpenUser={(userId) => {
              setSelectedUserId(userId);
              setPreviousPage('annonces-post');
              setCurrentPage('user-profile');
            }}
            initialTab="post"
          />
        ) : currentPage === 'mes-annonces' ? (
          <UserAnnonces onBack={() => setCurrentPage('home')} onAnnonces={() => setCurrentPage('annonces-post')} />
        ) : currentPage === 'admin' ? (
          <AdminDashboard onBack={() => setCurrentPage('home')} />
        ) : currentPage === 'annonce-details' && selectedAnnonceId ? (
          <AnnonceDetails
            onBack={() => setCurrentPage(previousPage)}
            annonceId={selectedAnnonceId}
            onOpenAnnonce={(annonceId) => {
              setSelectedAnnonceId(annonceId);
              setCurrentPage('annonce-details');
            }}
            onOpenUser={(userId) => {
              setSelectedUserId(userId);
              setPreviousPage('annonce-details');
              setCurrentPage('user-profile');
            }}
          />
        ) : currentPage === 'user-profile' && selectedUserId ? (
          <UserProfile
            userId={selectedUserId}
            onBack={() => setCurrentPage(previousPage)}
            onOpenAnnonce={(annonceId) => {
              setSelectedAnnonceId(annonceId);
              setPreviousPage('user-profile');
              setCurrentPage('annonce-details');
            }}
          />
        ) : currentPage === 'privacy' || currentPage === 'terms' || currentPage === 'cookies' || currentPage === 'gdpr' ? (
          <LegalPage page={currentPage} onBack={() => setCurrentPage('home')} />
        ) : (
          <>
            <HeroCarousel />
            <PublicAnnonces
              onOpenAnnonce={(annonceId) => {
                setSelectedAnnonceId(annonceId);
                setPreviousPage('home');
                setCurrentPage('annonce-details');
              }}
              onOpenUser={(userId) => {
                setSelectedUserId(userId);
                setPreviousPage('home');
                setCurrentPage('user-profile');
              }}
            />
            <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
              <section id="services" className="mt-20">
                <div className="text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    Services disponibles
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-slate-600">
                    Des professionnels qualifiés pour tous vos besoins
                  </p>
                </div>
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                  {[
                    { name: 'Plombier', icon: '🔧' },
                    { name: 'Électricien', icon: '⚡' },
                    { name: 'Technicien CVC', icon: '🌡️' },
                    { name: 'Dépannage routier', icon: '🚗' },
                    { name: 'Mécanicien mobile', icon: '🔨' },
                    { name: 'Serrurier', icon: '🔑' },
                    { name: 'Charpentier', icon: '🪚' },
                    { name: 'Peintre', icon: '🎨' },
                    { name: 'Nettoyage professionnel', icon: '🧹' },
                    { name: 'Entretien de piscine', icon: '🏊' },
                    { name: 'Installation CCTV', icon: '📹' },
                    { name: 'Transport de marchandises', icon: '🚚' },
                    { name: 'Jardinier', icon: '🌳' },
                    { name: 'Désinsectisation', icon: '🐛' },
                    { name: 'Service de pneus mobile', icon: '🛞' },
                    { name: 'Technicien d\'appareils', icon: '🔌' },
                  ].map((service) => (
                    <div key={service.name} className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                      <div className="text-4xl">{service.icon}</div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-900 text-center">{service.name}</h3>
                    </div>
                  ))}
                </div>
              </section>

              <section id="testimonials" className="mt-20">
                <div className="text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    Ce que disent nos clients
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-slate-600">
                    Des milliers de clients satisfaits partout au Maroc
                  </p>
                </div>
                <div className="mt-10 grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      name: 'Fatima Zahra',
                      location: 'Maarif, Casablanca',
                      avatar: '👩',
                      testimonial: 'Excellent plombier trouvé en moins de 30 minutes! Travail professionnel et prix honnête.',
                      rating: 5
                    },
                    {
                      name: 'Mohammed',
                      location: 'Anfa, Casablanca',
                      avatar: '👨',
                      testimonial: 'J\'ai trouvé un électricien qualifié rapidement. Le badge "Vérifié" m\'a mis en confiance.',
                      rating: 5
                    },
                    {
                      name: 'Amina',
                      location: 'Hay Hassani',
                      avatar: '👩',
                      testimonial: 'Plateforme très facile à utiliser. J\'ai pu comparer plusieurs artisans avant de choisir.',
                      rating: 5
                    }
                  ].map((testimonial, index) => (
                    <div key={index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{testimonial.avatar}</div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{testimonial.name}</h3>
                          <p className="text-sm text-slate-500">{testimonial.location}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-400">⭐</span>
                        ))}
                      </div>
                      <p className="mt-4 text-slate-700">"{testimonial.testimonial}"</p>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          </>
        )}

        <Footer onOpenLegalPage={(page) => setCurrentPage(page)} />
      </div>
    </AuthProvider>
  );
}
