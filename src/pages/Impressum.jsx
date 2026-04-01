import React from 'react';
import { ImprintContent } from '@/components/legal/ConsentDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Impressum() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>

        {/* Content */}
        <ImprintContent />

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>
            BarManager GmbH | Alle Angaben ohne Gewähr | 
            <a href="/Datenschutz" className="hover:text-foreground ml-2">
              Datenschutzerklärung →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}