import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp } from 'lucide-react';

const parseServingSize = (sizeString) => {
    if (!sizeString) return 0;
    const size = sizeString.toLowerCase().replace(',', '.');
    if (size.includes('l')) return parseFloat(size.replace('l', '').trim()) || 0;
    if (size.includes('cl')) return (parseFloat(size.replace('cl', '').trim()) || 0) / 100;
    if (size.includes('ml')) return (parseFloat(size.replace('ml', '').trim()) || 0) / 1000;
    return 0;
};

// Prevent Layout from wrapping this page
DailySpecialsDisplay.noLayout = true;

export default function DailySpecialsDisplay() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [specials, setSpecials] = useState([]);

    const { data: menuItems = [] } = useQuery({
        queryKey: ['menu-items-display'],
        queryFn: () => base44.entities.MenuItem.filter({ is_available: true })
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles-display'],
        queryFn: () => base44.entities.Article.list()
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (menuItems.length > 0 && articles.length > 0) {
            const itemsWithMargin = menuItems
                .map(item => {
                    let purchasePrice = 0;

                    if (item.linked_article_id) {
                        const linkedArticle = articles.find(a => a.id === item.linked_article_id);
                        if (linkedArticle) {
                            const servingSize = parseServingSize(item.size);
                            if (linkedArticle.price_per_liter && servingSize > 0) {
                                purchasePrice = linkedArticle.price_per_liter * servingSize;
                            } else if (linkedArticle.purchase_price && linkedArticle.content_amount && servingSize > 0) {
                                let contentInLiters = linkedArticle.content_amount;
                                const contentUnit = (linkedArticle.content_unit || 'ml').toLowerCase();
                                if (contentUnit === 'ml') contentInLiters = linkedArticle.content_amount / 1000;
                                else if (contentUnit === 'cl') contentInLiters = linkedArticle.content_amount / 100;
                                else if (contentUnit === 'g') contentInLiters = linkedArticle.content_amount / 1000;
                                else if (contentUnit === 'l' || contentUnit === 'kg') contentInLiters = linkedArticle.content_amount;
                                const pricePerLiter = linkedArticle.purchase_price / contentInLiters;
                                purchasePrice = pricePerLiter * servingSize;
                            }
                        }
                    } else if (item.purchase_price) {
                        purchasePrice = item.purchase_price;
                    }

                    if (purchasePrice > 0 && item.price > 0) {
                        const margin = item.price - purchasePrice;
                        const margin_percentage = (margin / purchasePrice) * 100;
                        return { ...item, margin_percentage };
                    }
                    return null;
                })
                .filter(item => item !== null)
                .sort((a, b) => b.margin_percentage - a.margin_percentage)
                .slice(0, 3);

            setSpecials(itemsWithMargin);
        }
    }, [menuItems, articles]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative h-full flex flex-col p-12">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <Sparkles className="w-16 h-16 text-amber-400 animate-pulse" />
                        <h1 className="text-8xl font-black text-white tracking-tight">
                            Tages-Specials
                        </h1>
                        <Sparkles className="w-16 h-16 text-amber-400 animate-pulse" />
                    </div>
                    <p className="text-3xl text-slate-300">
                        {currentTime.toLocaleDateString('de-DE', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </p>
                </div>

                {/* Specials Grid */}
                {specials.length > 0 ? (
                    <div className="flex-1 grid grid-cols-3 gap-8">
                        {specials.map((item, index) => (
                            <div
                                key={item.id}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-amber-500/30 shadow-2xl flex flex-col justify-between hover:scale-105 transition-transform duration-300"
                                style={{ animationDelay: `${index * 0.2}s` }}
                            >
                                <div>
                                    {index === 0 && (
                                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 px-4 py-2 rounded-full text-xl font-bold mb-6">
                                            <TrendingUp className="w-6 h-6" />
                                            Top Deal
                                        </div>
                                    )}
                                    <h2 className="text-5xl font-bold text-white mb-4 leading-tight">
                                        {item.name}
                                    </h2>
                                    {item.description && (
                                        <p className="text-2xl text-slate-300 mb-6 leading-relaxed">
                                            {item.description}
                                        </p>
                                    )}
                                    {item.size && (
                                        <div className="inline-block bg-slate-700/50 px-4 py-2 rounded-lg mb-6">
                                            <span className="text-xl text-slate-200">{item.size}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-auto pt-6 border-t-2 border-amber-500/30">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-xl text-slate-400 mb-1">Nur heute</p>
                                            <p className="text-7xl font-black text-amber-400">
                                                {item.price.toFixed(2)}€
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg text-slate-400">Gewinn</p>
                                            <p className="text-4xl font-bold text-green-400">
                                                {item.margin_percentage.toFixed(0)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-4xl text-slate-400">Keine Specials verfügbar</p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-12">
                    <p className="text-3xl text-slate-400">
                        {currentTime.toLocaleTimeString('de-DE', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}