import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const LEGAL_FORMS = ['Einzelunternehmer', 'GbR', 'oHG', 'KG', 'GmbH', 'AG', 'Ltd.', 'Sonstiges'];

export default function LegalSetupWizard({ open, onComplete }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    street: '',
    postal_code: '',
    city: '',
    email: '',
    phone: '',
    owner_name: '',
    legal_form: '',
    data_protection_contact: '',
  });

  // Load existing data
  useEffect(() => {
    if (open) {
      loadExistingData();
    }
  }, [open]);

  const loadExistingData = async () => {
    try {
      const result = await base44.entities.CompanyInfo.list();
      if (result.length > 0) {
        setCompanyInfo(result[0]);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  const handleChange = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validierung
    if (!companyInfo.company_name || !companyInfo.email || !companyInfo.owner_name) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    setIsLoading(true);
    try {
      const existing = await base44.entities.CompanyInfo.list();

      if (existing.length > 0) {
        // Update
        await base44.entities.CompanyInfo.update(existing[0].id, {
          ...companyInfo,
          setup_complete: true,
          last_updated: new Date().toISOString(),
        });
      } else {
        // Create
        await base44.entities.CompanyInfo.create({
          ...companyInfo,
          setup_complete: true,
          last_updated: new Date().toISOString(),
        });
      }

      toast.success('Rechtliche Angaben gespeichert');
      onComplete?.();
    } catch (error) {
      console.error('Error saving company info:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = companyInfo.company_name && companyInfo.email && companyInfo.owner_name;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rechtliche Angaben einrichten</DialogTitle>
          <DialogDescription>
            Schritt {step} von 2
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 1 ? (
            // Schritt 1: Pflichtangaben
            <div className="space-y-3">
              <div>
                <Label htmlFor="company_name" className="text-sm">
                  Firmenname *
                </Label>
                <Input
                  id="company_name"
                  value={companyInfo.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="z. B. Meine Bar GmbH"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="owner_name" className="text-sm">
                  Name des Betreibers / Verantwortlichen *
                </Label>
                <Input
                  id="owner_name"
                  value={companyInfo.owner_name}
                  onChange={(e) => handleChange('owner_name', e.target.value)}
                  placeholder="z. B. Max Mustermann"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm">
                  Kontakt-E-Mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="z. B. kontakt@example.de"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="legal_form" className="text-sm">
                  Rechtsform (optional)
                </Label>
                <Select value={companyInfo.legal_form} onValueChange={(val) => handleChange('legal_form', val)}>
                  <SelectTrigger id="legal_form" className="mt-1">
                    <SelectValue placeholder="Wähle eine Rechtsform" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_FORMS.map(form => (
                      <SelectItem key={form} value={form}>{form}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!isComplete}
                className="w-full mt-4"
              >
                Weiter
              </Button>
            </div>
          ) : (
            // Schritt 2: Adresse + Optional
            <div className="space-y-3">
              <div>
                <Label htmlFor="street" className="text-sm">
                  Straße und Hausnummer (optional)
                </Label>
                <Input
                  id="street"
                  value={companyInfo.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  placeholder="z. B. Hauptstraße 1"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="postal_code" className="text-sm">
                    PLZ (optional)
                  </Label>
                  <Input
                    id="postal_code"
                    value={companyInfo.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    placeholder="z. B. 10115"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-sm">
                    Stadt (optional)
                  </Label>
                  <Input
                    id="city"
                    value={companyInfo.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="z. B. Berlin"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm">
                  Telefonnummer (optional)
                </Label>
                <Input
                  id="phone"
                  value={companyInfo.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="z. B. +49 30 123456"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dp_contact" className="text-sm">
                  Datenschutz-Kontakt (optional, falls abweichend)
                </Label>
                <Input
                  id="dp_contact"
                  value={companyInfo.data_protection_contact}
                  onChange={(e) => handleChange('data_protection_contact', e.target.value)}
                  placeholder="z. B. datenschutz@example.de"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Zurück
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !isComplete}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Fertig
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}