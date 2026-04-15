/**
 * Storage-Hilfsfunktionen für Code-Generierung und Namensbildung
 */

/**
 * Generiert einen eindeutigen Short-Code für einen Lagerplatz
 * Format: LOC-XXXX (LOC + 4 zufällige alphanumerische Zeichen)
 */
export function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LOC-${code}`;
}

/**
 * Baut den vollständigen Lagerplatz-Pfad zusammen
 * Format: Area › Furniture › Container › Slot
 */
export function buildFullName(areaName, furnitureName, containerName, slotName) {
  return [areaName, furnitureName, containerName, slotName]
    .filter(Boolean)
    .join(' › ');
}