import { base44 } from '@/api/base44Client';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/**
 * Erzeugt einen Preishistorie-Eintrag, wenn sich der Preis geändert hat.
 * Muss vor dem eigentlichen Speichern des Artikels aufgerufen werden.
 *
 * @param {object} params
 * @param {string} params.articleId
 * @param {string} params.articleName
 * @param {number|undefined} params.oldPrice  – aktueller gespeicherter Preis
 * @param {number|undefined} params.newPrice  – neuer Preis nach Bearbeitung
 * @param {object} params.user                – base44 User-Objekt (email, full_name)
 * @param {string} [params.supplierName]
 * @param {string} [params.note]
 */
export async function recordPriceChange({ articleId, articleName, oldPrice, newPrice, user, supplierName, note }) {
    const oldNum = oldPrice != null ? parseFloat(oldPrice) : undefined;
    const newNum = newPrice != null ? parseFloat(newPrice) : undefined;

    // Kein Eintrag wenn kein neuer Preis gesetzt oder Preis unverändert
    if (newNum == null || isNaN(newNum)) return;
    if (oldNum != null && !isNaN(oldNum) && Math.abs(oldNum - newNum) < 0.001) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const change_date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const change_time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const weekday = WEEKDAYS[now.getDay()];

    await base44.entities.PriceHistory.create({
        article_id: articleId,
        article_name: articleName,
        old_price: (oldNum != null && !isNaN(oldNum)) ? oldNum : undefined,
        new_price: newNum,
        changed_by: user?.email || '',
        changed_by_name: user?.full_name || '',
        change_date,
        change_time,
        weekday,
        supplier_name: supplierName || undefined,
        price_type: 'Einkaufspreis',
        note: note || undefined
    });
}