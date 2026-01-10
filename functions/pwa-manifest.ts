Deno.serve(async (req) => {
    const manifest = {
        name: "BarManager - Bar Management App",
        short_name: "BarManager",
        description: "Komplette Bar Management Lösung für Mitarbeiter, Schichten, Zeiterfassung und mehr",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#d97706",
        orientation: "portrait-primary",
        icons: [
            {
                src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%23d97706'/%3E%3Ctext x='256' y='350' font-size='300' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='bold'%3EB%3C/text%3E%3C/svg%3E",
                sizes: "192x192",
                type: "image/svg+xml",
                purpose: "any maskable"
            },
            {
                src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%23d97706'/%3E%3Ctext x='256' y='350' font-size='300' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='bold'%3EB%3C/text%3E%3C/svg%3E",
                sizes: "512x512",
                type: "image/svg+xml",
                purpose: "any maskable"
            }
        ],
        categories: ["business", "productivity"],
        screenshots: [
            {
                src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 540 720'%3E%3Crect width='540' height='720' fill='%230f172a'/%3E%3Ctext x='270' y='360' font-size='48' text-anchor='middle' fill='white' font-family='Arial'%3EBarManager%3C/text%3E%3C/svg%3E",
                sizes: "540x720",
                type: "image/svg+xml",
                form_factor: "narrow"
            }
        ],
        shortcuts: [
            {
                name: "Stempeluhr",
                short_name: "Stempeln",
                description: "Ein- und Ausstempeln",
                url: "/?page=TimeTracking",
                icons: [
                    {
                        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Ccircle cx='48' cy='48' r='40' fill='%2322c55e'/%3E%3Cpath d='M48 28v20l14 8' stroke='white' stroke-width='4' stroke-linecap='round' fill='none'/%3E%3C/svg%3E",
                        sizes: "96x96"
                    }
                ]
            },
            {
                name: "Mein Dashboard",
                short_name: "Dashboard",
                description: "Persönliche Übersicht",
                url: "/?page=MyDashboard",
                icons: [
                    {
                        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='16' fill='%233b82f6'/%3E%3Crect x='16' y='16' width='28' height='28' rx='4' fill='white'/%3E%3Crect x='52' y='16' width='28' height='28' rx='4' fill='white'/%3E%3Crect x='16' y='52' width='28' height='28' rx='4' fill='white'/%3E%3Crect x='52' y='52' width='28' height='28' rx='4' fill='white'/%3E%3C/svg%3E",
                        sizes: "96x96"
                    }
                ]
            },
            {
                name: "Schichtplan",
                short_name: "Schichten",
                description: "Schichten ansehen",
                url: "/?page=Shifts",
                icons: [
                    {
                        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='16' fill='%238b5cf6'/%3E%3Crect x='20' y='24' width='56' height='8' rx='2' fill='white'/%3E%3Crect x='20' y='44' width='56' height='8' rx='2' fill='white'/%3E%3Crect x='20' y='64' width='56' height='8' rx='2' fill='white'/%3E%3C/svg%3E",
                        sizes: "96x96"
                    }
                ]
            }
        ]
    };

    return new Response(JSON.stringify(manifest), {
        status: 200,
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=3600'
        }
    });
});