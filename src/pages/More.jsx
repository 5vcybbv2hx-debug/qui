import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { LogOut } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import { haptics } from '@/components/utils/haptics';
import { navigationSections } from '@/components/navigation/navigationConfig';

export default function MorePage() {
    const permissions = usePermissions();
    const [currentUser, setCurrentUser] = React.useState(null);

    React.useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-background pb-8">
            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">

                {/* User Info Card */}
                {currentUser && (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <span className="text-slate-900 font-bold text-lg">
                                {currentUser.full_name?.charAt(0) || 'U'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{currentUser.full_name}</p>
                            <p className="text-sm text-muted-foreground truncate">{currentUser.email}</p>
                        </div>
                        <button
                            onClick={() => { haptics.light(); base44.auth.logout(); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex-shrink-0"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Abmelden</span>
                        </button>
                    </div>
                )}

                {/* Sections as Grid */}
                {navigationSections.map((section) => {
                    const visibleItems = section.items.filter(item => permissions[item.permission]);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.title}>
                            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
                                {section.title}
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                {visibleItems.map((item) => (
                                    <Link
                                        key={item.page}
                                        to={createPageUrl(item.page)}
                                        onClick={() => haptics.selection()}
                                        className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-muted-foreground/50 active:scale-95 transition-all text-center"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                                            <item.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-foreground leading-tight">
                                            {item.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}