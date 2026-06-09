import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { STALE } from '@/lib/queryUtils';
import DigitalBusinessCard from '@/components/company/DigitalBusinessCard';
import { Building2 } from 'lucide-react';

export default function BusinessCardPage() {
    const { data: companyInfo, isLoading } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const infos = await base44.entities.CompanyInfo.list('-last_updated', 1);
            return infos[0] || null;
        },
        staleTime: STALE.SLOW,
    });

    const { data: openingHours = [] } = useQuery({
        queryKey: ['opening-hours'],
        queryFn: () => base44.entities.OpeningHours.list('day_order', 10),
        staleTime: STALE.SLOW,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground text-sm animate-pulse">Lädt...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                <div className="mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-500" />
                        Digitale Visitenkarte
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Zeig deinen Gästen den QR-Code zum Abscannen
                    </p>
                </div>
                <DigitalBusinessCard companyInfo={companyInfo || {}} openingHours={openingHours} />
            </div>
        </div>
    );
}
