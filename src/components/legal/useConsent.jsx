import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LEGAL_VERSIONS } from '@/lib/legalContent';

/**
 * Hook zum Verwalten von Benutzer-Zustimmungen
 */
export function useConsent() {
  const [userConsent, setUserConsent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsNewConsent, setNeedsNewConsent] = useState(false);

  // Lade Zustimmung beim Start
  useEffect(() => {
    loadConsent();
  }, []);

  const loadConsent = async () => {
    try {
      setIsLoading(true);
      const user = await base44.auth.me();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Hole bestehende Zustimmung
      const consents = await base44.entities.UserConsent.filter({
        user_email: user.email
      }, '-created_date', 1);

      if (consents.length === 0) {
        // Keine Zustimmung vorhanden → neue erforderlich
        setNeedsNewConsent(true);
        setUserConsent(null);
      } else {
        const consent = consents[0];
        setUserConsent(consent);

        // Prüfe ob neue Version vorliegt
        if (
          consent.privacy_policy_version !== LEGAL_VERSIONS.PRIVACY_POLICY ||
          consent.imprint_version !== LEGAL_VERSIONS.IMPRINT
        ) {
          setNeedsNewConsent(true);
        } else {
          setNeedsNewConsent(false);
        }
      }
    } catch (error) {
      console.error('Error loading consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConsent = async (acceptedPrivacy, acceptedImprint) => {
    try {
      const user = await base44.auth.me();
      if (!user) return false;

      const consentData = {
        user_email: user.email,
        privacy_policy_version: LEGAL_VERSIONS.PRIVACY_POLICY,
        imprint_version: LEGAL_VERSIONS.IMPRINT,
        privacy_accepted: acceptedPrivacy,
        imprint_accepted: acceptedImprint,
        accepted_date: new Date().toISOString(),
        notes: 'Consent saved from dialog'
      };

      // Erstelle neue Zustimmung
      const created = await base44.entities.UserConsent.create(consentData);
      setUserConsent(created);
      setNeedsNewConsent(false);
      return true;
    } catch (error) {
      console.error('Error saving consent:', error);
      return false;
    }
  };

  const hasConsented = () => {
    return userConsent?.privacy_accepted === true && !needsNewConsent;
  };

  return {
    userConsent,
    isLoading,
    needsNewConsent,
    saveConsent,
    hasConsented,
    reload: loadConsent
  };
}