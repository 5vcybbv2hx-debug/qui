import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fillLegalTemplate, IMPRINT_TEMPLATE } from '@/lib/legalContent';
import { Card, CardContent } from '@/components/ui/card';

export default function LegalImprint() {
  const navigate = useNavigate();
  const [companyInfo, setCompanyInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await base44.entities.CompanyInfo.list();
        if (result.length > 0) {
          setCompanyInfo(result[0]);
        }
      } catch (error) {
        console.error('Error loading company info:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filledText = fillLegalTemplate(IMPRINT_TEMPLATE, companyInfo);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Impressum</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <Card className="bg-card">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Wird geladen...
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {filledText.split('\n').map((line, idx) => {
                  if (!line.trim()) return <div key={idx} className="h-2" />;
                  if (line.startsWith('❌')) {
                    return (
                      <p key={idx} className="text-red-500 text-sm font-medium py-1">
                        {line}
                      </p>
                    );
                  }
                  if (line.match(/^[A-Z]/)) {
                    return (
                      <h2 key={idx} className="text-lg font-bold mt-4 mb-2 text-foreground">
                        {line}
                      </h2>
                    );
                  }
                  if (line.match(/^\d+\./)) {
                    return (
                      <h3 key={idx} className="font-semibold mt-3 mb-2 text-foreground">
                        {line}
                      </h3>
                    );
                  }
                  return (
                    <p key={idx} className="text-foreground text-sm leading-relaxed py-0.5">
                      {line}
                    </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}