import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Tv } from 'lucide-react';
import { getTrafficColor, getTrafficLabel, getTrafficDot } from './useWorldCupMatches';

export default function MatchDetailSheet({ match, open, onClose }) {
    if (!match) return null;
    const kickoff = new Date(match.kickoff_time);
    const traffic = match.expected_bar_traffic || 'normal';

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2 flex-wrap">
                        {match.is_germany_game && (
                            <span className="text-xs font-bold bg-yellow-500 text-black px-2 py-0.5 rounded-full">
                                🇩🇪 DEUTSCHLAND
                            </span>
                        )}
                        {match.is_top_game && !match.is_germany_game && (
                            <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                ⭐ TOPPSPIEL
                            </span>
                        )}
                        <span className="text-base">{match.home_team} – {match.away_team}</span>
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-4">
                    {/* Score / Status */}
                    {(match.status === 'live' || match.status === 'beendet') && (
                        <div className={`text-center py-4 rounded-xl ${match.status === 'live' ? 'bg-red-500/10 border border-red-500/30' : 'bg-secondary'}`}>
                            <div className="font-mono font-bold text-4xl">
                                {match.home_score ?? 0} : {match.away_score ?? 0}
                            </div>
                            <div className={`text-sm font-medium mt-1 ${match.status === 'live' ? 'text-red-400 animate-pulse' : 'text-muted-foreground'}`}>
                                {match.status === 'live' ? '● LIVE' : 'Abpfiff'}
                            </div>
                        </div>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs">Anstoß</span>
                            </div>
                            <p className="font-bold">{format(kickoff, 'HH:mm')} Uhr</p>
                            <p className="text-xs text-muted-foreground">{format(kickoff, 'EEEE, d. MMMM', { locale: de })}</p>
                        </div>
                        <div className="bg-secondary/50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs">Runde</span>
                            </div>
                            <p className="font-bold text-sm">{match.round}</p>
                            {match.group_name && <p className="text-xs text-muted-foreground">{match.group_name}</p>}
                        </div>
                        {match.venue && (
                            <div className="bg-secondary/50 rounded-xl p-3 col-span-2">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-xs">Stadion</span>
                                </div>
                                <p className="font-medium text-sm">{match.venue}</p>
                            </div>
                        )}
                        {match.tv_channel && (
                            <div className="bg-secondary/50 rounded-xl p-3 col-span-2">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Tv className="w-4 h-4" />
                                    <span className="text-xs">TV-Sender</span>
                                </div>
                                <p className="font-medium text-sm">{match.tv_channel}</p>
                            </div>
                        )}
                    </div>

                    {/* Bar-Auslastung */}
                    <div className={`rounded-xl p-4 border ${getTrafficColor(traffic)}`}>
                        <p className="font-bold text-sm mb-1">{getTrafficDot(traffic)} Erwartete Bar-Auslastung</p>
                        <p className="font-bold text-lg">{getTrafficLabel(traffic)}</p>
                        {match.staff_recommendation && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current/20">
                                <Users className="w-4 h-4 shrink-0" />
                                <p className="text-sm">{match.staff_recommendation}</p>
                            </div>
                        )}
                    </div>

                    {match.notes && (
                        <div className="bg-secondary/50 rounded-xl p-3">
                            <p className="text-xs text-muted-foreground mb-1">Notizen</p>
                            <p className="text-sm">{match.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 pb-safe">
                        <Link to="/Calendar" className="flex-1">
                            <Button variant="outline" className="w-full" onClick={onClose}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Schichtplan
                            </Button>
                        </Link>
                        <Link to="/WorldCupSchedule" className="flex-1">
                            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={onClose}>
                                Alle WM-Spiele
                            </Button>
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}