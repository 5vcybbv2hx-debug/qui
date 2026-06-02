import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, RefreshCw, CheckCircle2 } from 'lucide-react';
import { calculateMatchImportance } from './useWorldCupMatches';
import { format } from 'date-fns';

export default function WorldCupImporter({ onClose }) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [jsonText, setJsonText] = useState('');

    const enrichMatch = (m) => {
        const { importance, traffic, staff_recommendation } = calculateMatchImportance(m);
        return {
            ...m,
            importance_level: m.importance_level || importance,
            expected_bar_traffic: m.expected_bar_traffic || traffic,
            staff_recommendation: m.staff_recommendation || staff_recommendation,
            last_updated: new Date().toISOString(),
        };
    };

    const handleImport = async () => {
        setLoading(true);
        setResult(null);
        try {
            const parsed = JSON.parse(jsonText);
            const matches = Array.isArray(parsed) ? parsed : [parsed];
            let created = 0;
            for (const m of matches) {
                await base44.entities.WorldCupMatch.create(enrichMatch(m));
                created++;
            }
            setResult({ success: true, count: created });
            queryClient.invalidateQueries(['world-cup-matches']);
        } catch (e) {
            setResult({ success: false, error: e.message });
        }
        setLoading(false);
    };

    const handleCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split('\n').filter(Boolean);
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = lines.slice(1).map(line => {
                const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const obj = {};
                headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
                if (obj.is_germany_game) obj.is_germany_game = obj.is_germany_game === 'true' || obj.is_germany_game === '1';
                if (obj.is_top_game) obj.is_top_game = obj.is_top_game === 'true' || obj.is_top_game === '1';
                return obj;
            });
            setJsonText(JSON.stringify(rows, null, 2));
        };
        reader.readAsText(file);
    };

    const exampleJson = JSON.stringify([
        {
            home_team: "Deutschland",
            away_team: "USA",
            kickoff_time: "2026-06-15T21:00:00Z",
            round: "Gruppenphase",
            group_name: "Gruppe A",
            venue: "MetLife Stadium, New Jersey",
            is_germany_game: true,
            is_top_game: true,
            status: "geplant"
        }
    ], null, 2);

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <label className="flex-1">
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">CSV importieren</span>
                    </div>
                    <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
                </label>
            </div>

            <div>
                <label className="text-sm text-muted-foreground mb-1 block">JSON eingeben / einfügen</label>
                <textarea
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                    placeholder={exampleJson}
                    className="w-full h-40 px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            {result && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    result.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                    {result.success ? (
                        <><CheckCircle2 className="w-4 h-4" /> {result.count} Spiele erfolgreich importiert</>
                    ) : (
                        <><span>Fehler: {result.error}</span></>
                    )}
                </div>
            )}

            <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>Abbrechen</Button>
                <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    onClick={handleImport}
                    disabled={!jsonText.trim() || loading}
                >
                    {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Importieren
                </Button>
            </div>
        </div>
    );
}