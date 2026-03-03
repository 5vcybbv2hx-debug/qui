// Interactive Guided Tour mit Element-Highlighting
import { useState, useEffect, useRef } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const tourSteps = [
  {
    id: 'welcome',
    title: 'Willkommen bei BarManager!',
    description: 'Lass dich kurz einführen. Diese Tour dauert ca. 2 Minuten.',
    selector: null,
    position: 'center'
  },
  {
    id: 'dashboard',
    title: 'Dashboard - Dein Überblick',
    description: 'Hier siehst du deinen Status, Schichten & aktuelle Aufgaben.',
    selector: '[data-tour="dashboard"]',
    position: 'bottom'
  },
  {
    id: 'clock-in',
    title: 'Zeit erfassen',
    description: 'Stempel dich hier ein & aus. Schnell erledigt! ⏱️',
    selector: '[data-tour="clock-in"]',
    position: 'bottom'
  },
  {
    id: 'calendar',
    title: 'Schichtkalender',
    description: 'Sehe deine Schichten, Urlaub & Schichttausch-Anfragen.',
    selector: '[data-tour="calendar"]',
    position: 'bottom'
  },
  {
    id: 'tasks',
    title: 'Deine Aufgaben',
    description: 'Checke deine Putztätigkeiten & TODOs.',
    selector: '[data-tour="tasks"]',
    position: 'bottom'
  },
  {
    id: 'recipes',
    title: 'Rezepte & Getränke',
    description: 'Alle Cocktails & Rezepte. Perfekt zum Lernen!',
    selector: '[data-tour="recipes"]',
    position: 'bottom'
  },
  {
    id: 'done',
    title: 'Fertig! 🎉',
    description: 'Du kannst die Tour anhalten & app erkunden. Viel Erfolg!',
    selector: null,
    position: 'center'
  }
];

function getElementPosition(selector) {
  if (!selector) return null;
  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}

export function InteractiveTour({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPos, setHighlightPos] = useState(null);
  const [showBackdrop, setShowBackdrop] = useState(true);
  const tourRef = useRef(null);

  const step = tourSteps[currentStep];

  useEffect(() => {
    if (step.selector) {
      const pos = getElementPosition(step.selector);
      if (pos) {
        setHighlightPos(pos);
        // Scroll zu Element
        const element = document.querySelector(step.selector);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, step.selector]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const tooltipPosition = () => {
    if (!highlightPos) return 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    
    const { top, left, width, height } = highlightPos;
    const viewportHeight = window.innerHeight;
    
    if (step.position === 'bottom' && top + height + 200 < viewportHeight) {
      return `fixed top-[${top + height + 20}px] left-[${left + width / 2}px] -translate-x-1/2`;
    } else if (top > 200) {
      return `fixed top-[${top - 150}px] left-[${left + width / 2}px] -translate-x-1/2`;
    } else {
      return `fixed top-[${top + height + 20}px] left-[${left + width / 2}px] -translate-x-1/2`;
    }
  };

  return (
    <>
      {/* Backdrop mit Hole */}
      {showBackdrop && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={handleSkip}>
          {highlightPos && (
            <div
              className="absolute rounded-lg ring-4 ring-amber-400 ring-offset-2 ring-offset-black/50"
              style={{
                top: `${highlightPos.top}px`,
                left: `${highlightPos.left}px`,
                width: `${highlightPos.width}px`,
                height: `${highlightPos.height}px`,
              }}
            />
          )}
        </div>
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'fixed z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-6',
          tooltipPosition()
        )}
        ref={tourRef}
      >
        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 hover:bg-secondary rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground pr-6">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>

          {/* Progress Dots */}
          <div className="flex gap-1 pt-2">
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx === currentStep ? 'bg-amber-400 w-6' : idx < currentStep ? 'bg-amber-400 w-2' : 'bg-border w-2'
                )}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              Überspringen
            </button>
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium transition-colors"
            >
              {currentStep === tourSteps.length - 1 ? 'Fertig' : 'Weiter'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function useTour() {
  const [showTour, setShowTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  const startTour = () => setShowTour(true);
  const completeTour = () => {
    setShowTour(false);
    setTourCompleted(true);
    localStorage.setItem('tour_completed', 'true');
  };

  const skipTour = () => {
    setShowTour(false);
    localStorage.setItem('tour_skipped', 'true');
  };

  // Check ob Tour schon gemacht
  useEffect(() => {
    const completed = localStorage.getItem('tour_completed');
    const skipped = localStorage.getItem('tour_skipped');
    if (completed || skipped) {
      setTourCompleted(true);
    } else {
      setShowTour(true);
    }
  }, []);

  return { showTour, tourCompleted, startTour, completeTour, skipTour };
}