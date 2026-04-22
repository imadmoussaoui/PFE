type LegalPageKind = 'privacy' | 'terms' | 'cookies' | 'gdpr';

interface LegalSection {
    heading: string;
    paragraphs: string[];
}

interface LegalContent {
    title: string;
    intro: string;
    sections: LegalSection[];
}

const LEGAL_CONTENT: Record<LegalPageKind, LegalContent> = {
    privacy: {
        title: 'Politique de confidentialite',
        intro: 'Cette politique explique quelles donnees personnelles nous collectons, pourquoi nous les utilisons et comment nous les protegons.',
        sections: [
            {
                heading: 'Donnees collectees',
                paragraphs: [
                    'Nous collectons les informations que vous fournissez lors de la creation de compte, de la publication d annonces et des echanges avec les autres utilisateurs.',
                    'Ces informations peuvent inclure votre nom, prenom, adresse email, numero de telephone, ville, photo de profil et contenu de vos annonces.',
                ],
            },
            {
                heading: 'Utilisation des donnees',
                paragraphs: [
                    'Vos donnees sont utilisees pour fournir le service, afficher vos annonces, securiser la plateforme et prevenir les abus.',
                    'Nous utilisons aussi certaines informations techniques pour ameliorer les performances, la navigation et la qualite globale de la plateforme.',
                ],
            },
            {
                heading: 'Partage et conservation',
                paragraphs: [
                    'Nous ne vendons pas vos donnees personnelles. Les donnees peuvent etre partagees uniquement avec des prestataires techniques necessaires au fonctionnement du service.',
                    'Les donnees sont conservees pendant la duree necessaire aux finalites du service, puis supprimees ou anonymisees selon les obligations legales.',
                ],
            },
            {
                heading: 'Securite',
                paragraphs: [
                    'Nous mettons en place des mesures techniques et organisationnelles raisonnables pour proteger vos informations contre l acces non autorise, la perte ou l alteration.',
                ],
            },
        ],
    },
    terms: {
        title: 'Conditions d utilisation',
        intro: 'En utilisant la plateforme, vous acceptez les presentes conditions qui encadrent l acces au service et les responsabilites de chacun.',
        sections: [
            {
                heading: 'Objet du service',
                paragraphs: [
                    'La plateforme met en relation des utilisateurs et des professionnels pour la publication et la consultation d annonces de services.',
                    'Nous nous reservons le droit de modifier, suspendre ou faire evoluer certaines fonctionnalites afin de maintenir un service fiable et securise.',
                ],
            },
            {
                heading: 'Compte utilisateur',
                paragraphs: [
                    'Vous etes responsable des informations que vous publiez et de la confidentialite de vos identifiants de connexion.',
                    'Vous vous engagez a fournir des informations exactes et a maintenir votre profil a jour.',
                ],
            },
            {
                heading: 'Comportements interdits',
                paragraphs: [
                    'Sont interdits notamment: la publication de contenu frauduleux, trompeur, illegal, diffamatoire ou contraire aux lois applicables.',
                    'Tout abus, tentative de contournement des regles de moderation ou atteinte a la securite peut entrainer la suspension du compte.',
                ],
            },
            {
                heading: 'Limitation de responsabilite',
                paragraphs: [
                    'La plateforme agit comme intermediaire technique. Les utilisateurs restent responsables de leurs annonces, de leurs echanges et des transactions realisees entre eux.',
                ],
            },
        ],
    },
    cookies: {
        title: 'Politique des cookies',
        intro: 'Cette politique decrit les cookies et technologies similaires utilises pour faire fonctionner et ameliorer la plateforme.',
        sections: [
            {
                heading: 'Qu est-ce qu un cookie',
                paragraphs: [
                    'Un cookie est un petit fichier texte enregistre sur votre appareil lors de la navigation. Il permet de reconnaitre votre navigateur et de memoriser certaines preferences.',
                ],
            },
            {
                heading: 'Types de cookies utilises',
                paragraphs: [
                    'Cookies strictement necessaires: essentiels au fonctionnement du site, a l authentification et a la securite des sessions.',
                    'Cookies de mesure d audience et de performance: utilises pour analyser l usage du service et ameliorer l experience utilisateur.',
                ],
            },
            {
                heading: 'Gestion de vos preferences',
                paragraphs: [
                    'Vous pouvez configurer votre navigateur pour refuser ou supprimer certains cookies. Toutefois, certaines fonctionnalites peuvent ne plus fonctionner correctement.',
                ],
            },
            {
                heading: 'Duree de conservation',
                paragraphs: [
                    'Les cookies sont conserves pour une duree limitee et proportionnee a leur finalite, conformement aux exigences legales applicables.',
                ],
            },
        ],
    },
    gdpr: {
        title: 'RGPD',
        intro: 'Conformement au Reglement General sur la Protection des Donnees (RGPD), vous disposez de droits sur vos donnees personnelles.',
        sections: [
            {
                heading: 'Vos droits',
                paragraphs: [
                    'Vous pouvez demander l acces, la rectification, l effacement, la limitation du traitement, l opposition au traitement et la portabilite de vos donnees.',
                    'Vous avez egalement le droit de retirer votre consentement a tout moment lorsque le traitement repose sur celui-ci.',
                ],
            },
            {
                heading: 'Exercice des droits',
                paragraphs: [
                    'Pour exercer vos droits, vous pouvez nous contacter a l adresse email de support. Nous pouvons vous demander des informations complementaires pour verifier votre identite.',
                    'Nous nous engageons a traiter votre demande dans les delais prevus par la reglementation.',
                ],
            },
            {
                heading: 'Base legale des traitements',
                paragraphs: [
                    'Les traitements realises reposent selon les cas sur l execution du contrat, l interet legitime, le respect d obligations legales ou votre consentement.',
                ],
            },
            {
                heading: 'Autorite de controle',
                paragraphs: [
                    'Si vous estimez que vos droits ne sont pas respectes, vous pouvez introduire une reclamation aupres de l autorite de protection des donnees competente.',
                ],
            },
        ],
    },
};

export default function LegalPage({ page, onBack }: { page: LegalPageKind; onBack: () => void }) {
    const content = LEGAL_CONTENT[page];

    return (
        <section className="min-h-screen bg-slate-50 pt-24 pb-12 px-6 sm:px-8">
            <div className="mx-auto max-w-4xl">
                <button
                    onClick={onBack}
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Retour
                </button>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{content.title}</h1>
                    <p className="mt-3 text-sm text-slate-600 sm:text-base">{content.intro}</p>

                    <div className="mt-6 space-y-6">
                        {content.sections.map((section) => (
                            <section key={section.heading} className="space-y-2">
                                <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>
                                {section.paragraphs.map((paragraph, index) => (
                                    <p key={`${section.heading}-${index}`} className="text-sm leading-7 text-slate-700 sm:text-base">
                                        {paragraph}
                                    </p>
                                ))}
                            </section>
                        ))}
                    </div>

                    <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:text-sm">
                        Derniere mise a jour: 15 avril 2026
                    </p>
                </article>
            </div>
        </section>
    );
}

export type { LegalPageKind };