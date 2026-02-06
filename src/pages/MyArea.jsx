import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Umbrella, RepeatIcon, QrCode } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';

// Import existing page components
import MyProfilePage from './MyProfile';
import VacationPage from './Vacation';
import ShiftSwapsPage from './ShiftSwaps';
import DigitalBusinessCard from '@/components/company/DigitalBusinessCard';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function MyAreaPage() {
    const permissions = usePermissions();
    const [activeTab, setActiveTab] = useState('profile');

    const { data: companyInfo } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const infos = await base44.entities.CompanyInfo.list();
            return infos[0] || null;
        }
    });

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Mein Bereich</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">Profil, Urlaub und Schichttausch</p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700 h-auto p-1">
                        <TabsTrigger value="profile" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <User className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Profil</span>
                        </TabsTrigger>
                        <TabsTrigger value="vacation" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <Umbrella className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Urlaub</span>
                        </TabsTrigger>
                        <TabsTrigger value="swaps" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <RepeatIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Tausch</span>
                        </TabsTrigger>
                        <TabsTrigger value="card" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <QrCode className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Karte</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-0">
                        <MyProfilePage />
                    </TabsContent>

                    <TabsContent value="vacation" className="space-y-0">
                        <VacationPage />
                    </TabsContent>

                    <TabsContent value="swaps" className="space-y-0">
                        <ShiftSwapsPage />
                    </TabsContent>

                    <TabsContent value="card" className="space-y-0">
                        <div className="bg-slate-900 p-4 sm:p-6 rounded-lg">
                            <DigitalBusinessCard companyInfo={companyInfo} />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}