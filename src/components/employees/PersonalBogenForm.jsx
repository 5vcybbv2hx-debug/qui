import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SECTIONS, calculateCompletion, getMissingFields, getSectionCompletion } from '@/lib/employeeCompleteness';
import { cn } from '@/lib/utils';
import { User, MapPin, Phone, FileText, CreditCard, AlertCircle, Save, Loader2 } from 'lucide-react';
import SignaturePad from './SignaturePad';

const SECTION_ICONS = {
  stammdaten: User,
  adresse: MapPin,
  kontakt: Phone,
  steuer: FileText,
  bank: CreditCard,
  notfall: AlertCircle,
  unterschriften: FileText
};

export default function PersonalBogenForm({ employee, onSave, isLoading = false, isEditable = true }) {
  const [formData, setFormData] = useState(employee || {});
  const [activeSection, setActiveSection] = useState('stammdaten');

  const completion = calculateCompletion(formData);
  const missingFields = getMissingFields(formData);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const renderField = (label, field, type = 'text', options = null) => (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {type === 'select' ? (
        <Select value={formData[field] || ''} onValueChange={(value) => handleChange(field, value)} disabled={!isEditable}>
          <SelectTrigger id={field} className="h-10">
            <SelectValue placeholder="Bitte wählen..." />
          </SelectTrigger>
          <SelectContent>
            {options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === 'textarea' ? (
        <Textarea
          id={field}
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          disabled={!isEditable}
          className="min-h-24 text-base"
        />
      ) : (
        <Input
          id={field}
          type={type}
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          disabled={!isEditable}
          className="h-10 text-base"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Fortschrittsanzeige */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-lg">Personalbogen</CardTitle>
            <span className="text-2xl font-bold text-amber-500">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
          <CardDescription className="mt-2">
            {completion === 100 ? '✓ Vollständig' : `${Object.keys(missingFields).length} Abschnitte unvollständig`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Fehlende Felder Warnung */}
      {Object.keys(missingFields).length > 0 && (
        <Alert className="border-orange-500/30 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-sm text-orange-700">
            Bitte füllen Sie die folgenden Abschnitte aus: {Object.values(missingFields).map((fields, i) => 
              <span key={i}>{Object.keys(SECTIONS).find(key => SECTIONS[key].label.includes(key))}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Formular Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-7 w-full gap-1">
          {Object.entries(SECTIONS).map(([key, section]) => {
            const sectionCompletion = getSectionCompletion(formData, key);
            const Icon = SECTION_ICONS[key];
            return (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  'flex flex-col items-center gap-1 py-3',
                  sectionCompletion === 100 ? 'border-green-500' : missingFields[key] ? 'border-orange-500' : ''
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">{sectionCompletion}%</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Stammdaten */}
        <TabsContent value="stammdaten" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Stammdaten</CardTitle>
              <CardDescription>Grundlegende persönliche Informationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField('Name', 'name')}
              {renderField('Geburtsdatum', 'birthday', 'date')}
              {renderField('Geburtsort', 'birth_place')}
              {renderField('Geburtsname', 'birth_name')}
              {renderField('Nationalität', 'nationality')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adresse */}
        <TabsContent value="adresse" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
              <CardDescription>Wohnort und Postleitzahl</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField('Straße und Hausnummer', 'street')}
              {renderField('Postleitzahl', 'postal_code')}
              {renderField('Stadt', 'city')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kontaktdaten */}
        <TabsContent value="kontakt" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Kontaktdaten</CardTitle>
              <CardDescription>Telefon und E-Mail</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField('Telefon', 'phone', 'tel')}
              {renderField('E-Mail', 'email', 'email')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steuer & Sozialversicherung */}
        <TabsContent value="steuer" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Steuer & Sozialversicherung</CardTitle>
              <CardDescription>Steuernummer und Versicherungsinformationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField('Steuer-ID', 'tax_id')}
              {renderField('Rentenversicherungsnummer', 'pension_number')}
              {renderField('Krankenkasse', 'health_insurance')}
              {renderField('Befreiungsantrag Rentenversicherung', 'pension_exemption', 'checkbox')}
              {renderField('Versicherungspflichtige Hauptbeschäftigung', 'has_main_job', 'checkbox')}
              {renderField('Weitere geringfügige Beschäftigung', 'has_other_minijob', 'checkbox')}
              {formData.has_other_minijob && renderField('Details zur weiteren Beschäftigung', 'other_minijob_details', 'textarea')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bankdaten */}
        <TabsContent value="bank" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bankdaten</CardTitle>
              <CardDescription>Kontoverbindung für Gehaltszahlung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField('Kreditinstitut', 'bank_name')}
              {renderField('IBAN', 'iban')}
              {renderField('BIC', 'bic')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notfallkontakt */}
         <TabsContent value="notfall" className="space-y-6 mt-6">
           <Card>
             <CardHeader>
               <CardTitle>Notfallkontakt</CardTitle>
               <CardDescription>Person die im Notfall kontaktiert werden soll</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {renderField('Name', 'emergency_contact_name')}
               {renderField('Telefon', 'emergency_contact_phone', 'tel')}
               {renderField('Beziehung', 'emergency_contact_relation', 'select', [
                 { value: 'Ehepartner', label: 'Ehepartner' },
                 { value: 'Eltern', label: 'Eltern' },
                 { value: 'Kind', label: 'Kind' },
                 { value: 'Geschwister', label: 'Geschwister' },
                 { value: 'Freund', label: 'Freund' },
                 { value: 'Sonstiges', label: 'Sonstiges' }
               ])}
             </CardContent>
           </Card>
         </TabsContent>

        {/* Unterschriften */}
        <TabsContent value="unterschriften" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Unterschriften</CardTitle>
              <CardDescription>Bestätigung durch Arbeitnehmer und Arbeitgeber</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SignaturePad 
                label="Unterschrift Arbeitnehmer"
                onSign={(signature) => handleChange('sig_employee', signature)}
              />
              <SignaturePad 
                label="Unterschrift Arbeitgeber (Manager)"
                onSign={(signature) => handleChange('sig_employer', signature)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

      {/* Save Button */}
      {isEditable && (
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full h-11 text-base font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </>
          )}
        </Button>
      )}
    </div>
  );
}