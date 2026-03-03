// Onboarding Page - Welcome & Guided Setup
import React, { useState } from 'react';
import { InteractiveTour } from '@/components/onboarding/InteractiveTour';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function Onboarding() {
  const [showTour, setShowTour] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mb-6">
            <Sparkles className="w-10 h-10 text-slate-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Willkommen bei BarManager!
          </h1>
          <p className="text-lg text-slate-300">
            Du bist jetzt Teil des Teams. Lass dich einführen & lerne die App kennen.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="checklist" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700">
            <TabsTrigger value="checklist" className="data-[state=active]:bg-amber-500">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aufgaben
            </TabsTrigger>
            <TabsTrigger value="guide" className="data-[state=active]:bg-amber-500">
              <Sparkles className="w-4 h-4 mr-2" />
              Anleitung
            </TabsTrigger>
          </TabsList>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="mt-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 md:p-8">
              <OnboardingChecklist />
            </div>
          </TabsContent>

          {/* Guide Tab */}
          <TabsContent value="guide" className="mt-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 md:p-8">
              <div className="space-y-8">
                {/* Schnellstart */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">🚀 Schnellstart (2 Min)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        title: 'Zeit erfassen',
                        desc: 'Stempel dich mit 1 Klick ein/aus',
                        icon: '⏱️'
                      },
                      {
                        title: 'Schichten ansehen',
                        desc: 'Schau deinen Kalender & Schichten',
                        icon: '📅'
                      },
                      {
                        title: 'Aufgaben checken',
                        desc: 'Deine TODOs & Putztätigkeiten',
                        icon: '✅'
                      },
                      {
                        title: 'Rezepte lernen',
                        desc: 'Cocktail-Rezepte & Getränkekarte',
                        icon: '🍹'
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-slate-700/50 border border-slate-600 hover:border-amber-500/50 transition-colors">
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-slate-300">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQ */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">❓ Häufige Fragen</h2>
                  <div className="space-y-4">
                    {[
                      {
                        q: 'Wie erfasse ich meine Arbeitszeit?',
                        a: 'Klick auf "Zeit erfassen" im Dashboard & stempel dich ein. Die App trackt deine Stunden automatisch.'
                      },
                      {
                        q: 'Kann ich meine Schicht tauschen?',
                        a: 'Ja! Geh zum Kalender & nutze die "Schicht tauschen" Funktion. Der Manager muss bestätigen.'
                      },
                      {
                        q: 'Wo finde ich die Cocktail-Rezepte?',
                        a: 'Im Menü → "Rezepte". Alle Rezepte mit Zutaten & Zubereitungsanleitung.'
                      },
                      {
                        q: 'Was ist meine PIN für?',
                        a: 'Die PIN ist eine Sicherheits-Maßnahme für sensible Operationen am Terminal.'
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                        <p className="text-sm text-slate-300">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tour starten */}
                <button
                  onClick={() => setShowTour(true)}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-semibold hover:shadow-lg hover:shadow-amber-500/20 transition-all"
                >
                  🎯 Interaktive Tour starten
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tour Modal */}
        {showTour && (
          <InteractiveTour
            onComplete={() => setShowTour(false)}
            onSkip={() => setShowTour(false)}
          />
        )}
      </div>
    </div>
  );
}