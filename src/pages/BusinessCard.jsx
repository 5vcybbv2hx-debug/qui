import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DigitalBusinessCard from '@/components/company/DigitalBusinessCard';
import { Building2 } from 'lucide-react';

export default function BusinessCardPage() {
    const { data: companyInfo, isLoading } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const infos = await base44.entities.CompanyInfo.list();
            return infos[0] || null;
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-white">Lädt...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-amber-500" />
                        Digitale Visitenkarte
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Zeig deinen Kunden den QR-Code zum Abscannen
                    </p>
                </div>
                <DigitalBusinessCard companyInfo={companyInfo || {}} />
            </div>
        </div>
    );
}