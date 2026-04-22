import { useState, useEffect } from 'react';

interface HeroImage {
    id: number;
    title: string;
    description: string;
    image: string;
}

const heroImages: HeroImage[] = [
    {
        id: 1,
        title: 'Électricité & Installation',
        description: 'Électriciens professionnels pour tous vos besoins',
        image: 'https://images.unsplash.com/photo-1621905167918-48416bd8575a?w=1200&h=600&fit=crop',
    },
    {
        id: 2,
        title: 'Plomberie & Dépannage',
        description: 'Services de plomberie fiables et compétents',
        image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200&h=600&fit=crop',
    },
    {
        id: 3,
        title: 'Réparation & Maintenance',
        description: 'Réparation d\'appareils et maintenance régulière',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop',
    },
    {
        id: 4,
        title: 'Nettoyage Professionnel',
        description: 'Services de nettoyage de haute qualité',
        image: 'https://images.unsplash.com/photo-1527925256569-940c3c4ea7d8?w=1200&h=600&fit=crop',
    },
    {
        id: 5,
        title: 'Travaux & Rénovation',
        description: 'Expertise en travaux de construction et rénovation',
        image: 'https://images.unsplash.com/photo-1581092916550-e323be2ae537?w=1200&h=600&fit=crop',
    },
];

export default function HeroCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);

    useEffect(() => {
        if (!isAutoPlay) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % heroImages.length);
        }, 5000); // Change image every 5 seconds

        return () => clearInterval(interval);
    }, [isAutoPlay]);

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
        setIsAutoPlay(false);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
        setIsAutoPlay(false);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % heroImages.length);
        setIsAutoPlay(false);
    };

    const currentImage = heroImages[currentIndex];

    return (
        <section className="relative h-96 sm:h-[500px] lg:h-[600px] w-full overflow-hidden bg-slate-900">
            {/* Carousel Container */}
            <div
                className="relative w-full h-full transition-opacity duration-500"
                onMouseEnter={() => setIsAutoPlay(false)}
                onMouseLeave={() => setIsAutoPlay(true)}
            >
                {/* Background Image */}
                <img
                    src={currentImage.image}
                    alt={currentImage.title}
                    className="w-full h-full object-cover"
                />

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/40" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
                        {currentImage.title}
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-100 mb-6">
                        {currentImage.description}
                    </p>
                    <button className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 sm:py-3 px-6 sm:px-8 rounded-full transition duration-300">
                        Découvrir les services
                    </button>
                </div>
            </div>

            {/* Previous Button */}
            <button
                onClick={goToPrevious}
                className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 bg-white/30 hover:bg-white/50 text-white p-2 sm:p-3 rounded-full transition duration-300 backdrop-blur-sm"
                aria-label="Image précédente"
            >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Next Button */}
            <button
                onClick={goToNext}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 bg-white/30 hover:bg-white/50 text-white p-2 sm:p-3 rounded-full transition duration-300 backdrop-blur-sm"
                aria-label="Image suivante"
            >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 sm:gap-3">
                {heroImages.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`transition duration-300 rounded-full ${index === currentIndex
                                ? 'bg-white w-8 sm:w-10 h-2 sm:h-2.5'
                                : 'bg-white/50 hover:bg-white/70 w-2 sm:w-2.5 h-2 sm:h-2.5'
                            }`}
                        aria-label={`Aller à la slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
