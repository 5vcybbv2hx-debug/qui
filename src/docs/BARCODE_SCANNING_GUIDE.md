# Barcode & QR-Code Scanning System

## Übersicht

Vollständiges Barcode- und QR-Code-Scanning-System für die Bar-App mit:
- ✅ Mobile-optimierter Kamera-Scanner
- ✅ Robuste Code-Erkennung (Debouncing, Fehlerbehandlung)
- ✅ Intelligent Matching (exakt / fuzzy)
- ✅ Direkte Integration in Restock-Liste und Artikelverwaltung
- ✅ PWA-kompatibel (iOS + Android)

---

## Komponenten & Module

### 1. **BarcodeScanner.jsx** (Basis)
Robuster Kamera-Scanner mit Html5Qrcode.

**Features:**
- Rückkamera bevorzugt, Fallback auf beliebige Kamera
- Unterstützt: QR-Codes, CODE_128, CODE_39, EAN_13, EAN_8, UPC_A, UPC_E
- Audio + Vibration-Feedback
- Fehlerbehandlung (Kamera nicht gefunden, Berechtigungen verweigert)
- Manuelle Code-Eingabe als Fallback
- iOS PWA kompatibel

**Verwendung:**
```jsx
<BarcodeScanner
  open={scannerOpen}
  onClose={() => setScannerOpen(false)}
  onScan={(code) => console.log('Gescanned:', code)}
  title="Barcode scannen"
  hint="Halte den Code vor die Kamera"
/>
```

---

### 2. **BarcodeScanner.enhanced.jsx**
Erweiterte Wrapper-Komponente mit Debouncing & Matching.

**Features:**
- Debounce-Protection (800ms) gegen doppelte Scans
- Automatische Artikel-Suche
- Disambiguierungs-UI für mehrere Treffer
- "Nicht gefunden"-Modus mit Optionen

**Verwendung:**
```jsx
<BarcodeScannerEnhanced
  open={scannerOpen}
  onClose={() => setScannerOpen(false)}
  articles={articleList}
  onArticleSelected={(article) => handleArticleAdd(article)}
  onCreateNew={(code) => handleNewArticle(code)}
/>
```

---

### 3. **scanCodeSearch.js** (Utility)
Code-Matching-Logik für robuste Artikel-Suche.

**Funktionen:**

#### `findArticleByCode(code, articles)`
Findet einen Artikel per exaktem Match.

```javascript
const result = findArticleByCode('5901234123457', articles);
if (result) {
  console.log(result.article, result.matchType); // 'barcode' | 'qr_code' | 'barcode_partial'
}
```

#### `findArticlesByCodeFuzzy(code, articles)`
Findet mehrere potenzielle Treffer (für Disambiguierung).

```javascript
const matches = findArticlesByCodeFuzzy('5901234', articles);
matches.forEach(m => console.log(m.article.name, m.score));
```

---

### 4. **ScanResultModal.jsx**
UI für Scan-Ergebnisse mit drei States:
- ✅ Single Match (Artikel gefunden)
- 🤔 Multiple Matches (Disambiguierung)
- ❌ Not Found (Kein Artikel)

---

### 5. **ArticleModalWithScanning.jsx**
Artikel-Editor mit integrierten Barcode/QR-Scanner.

**Features:**
- Separate Felder für Barcode & QR-Code
- Scanner-Buttons für jedes Feld
- Erfolgs-Feedback nach dem Scannen
- Codes können manuell eingegeben oder gescannt werden

**Verwendung:**
```jsx
<ArticleModalWithScanning
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  article={currentArticle}
  onSave={(data) => saveArticle(data)}
  isSaving={saving}
/>
```

---

### 6. **ScanCodeBadge.jsx**
Visueller Indikator für vorhandene Codes auf Artikel-Cards.

```jsx
<ScanCodeBadge barcode={article.barcode} qrCode={article.qr_code} />
```

---

## Datenmodell

### Article-Schema (entities/Article.json)

Neue Felder:
```json
{
  "barcode": "string",        // Eindeutige EAN/Barcode (z.B. 5901234123457)
  "qr_code": "string"         // Interne QR-Code (optional)
}
```

Bestehende Felder werden unverändert beibehalten.

---

## Integration: Restock-Seite

### Vorher:
```jsx
<BarcodeScanner
  open={scannerOpen}
  onClose={() => setScannerOpen(false)}
  onScan={handleCameraScan}
/>
```

### Nachher:
```jsx
<BarcodeScannerEnhanced
  open={scannerOpen}
  onClose={() => setScannerOpen(false)}
  articles={articles}
  onArticleSelected={(article) => {
    setScannerOpen(false);
    handleScan(article.barcode);
  }}
  onCreateNew={(code) => {
    setScannerOpen(false);
    // Optional: Trigger neuer Artikel
  }}
/>
```

**Workflow:**
1. Nutzer tippt "Kamera" → Scanner öffnet
2. Scanner scannt Code
3. `findArticleByCode()` sucht Artikel
4. `ScanResultModal` zeigt Ergebnis
5. Bei Match: Menge-Modal öffnet, Artikel hinzugefügt
6. Bei Mehrfach-Match: Nutzer disambiguiert
7. Bei Nicht-Gefunden: Option zum Neuen Artikel

---

## Integration: Artikel-Modal

**Vorher:** Nur Name, Kategorie, Preis
**Nachher:** + Barcode/QR Scanner-Buttons

```jsx
<Button onClick={() => {
  setActiveCodeField('barcode');
  setScannerOpen(true);
}}>
  <Camera className="w-3.5 h-3.5 mr-1.5" />
  Barcode scannen
</Button>
```

**Workflow:**
1. Nutzer öffnet Artikel-Modal
2. Klickt "Barcode scannen" → Scanner öffnet
3. Scanner scannt → Code wird sofort ins Feld gefüllt
4. Success-Badge zeigt "Gescannt" für 2s
5. Nutzer speichert Artikel mit Code

---

## Mobile UX Best Practices

### ✅ Implementiert:
- Full-screen Scanner auf Mobile (100dvh)
- Großes Kamerabild, zentraler Scan-Rahmen
- Haptic + Audio-Feedback
- Große, gut-tappbare Buttons
- Klare Erfolgs-/Fehler-Meldungen
- "Manuell eingeben"-Fallback
- Keine horizontale Scrollbarkeit

### iOS PWA Specifics:
```javascript
// Automatically forced in BarcodeScanner.jsx:
video.setAttribute('playsinline', 'true');
video.setAttribute('muted', 'true');
video.play().catch(() => {});
```

### Android Support:
- Rückkamera bevorzugt via `facingMode: { ideal: 'environment' }`
- Fallback auf beliebige Kamera

---

## Debugging & Troubleshooting

### Scanner funktioniert nicht
1. **Berechtigungen prüfen:**
   - iOS: Einstellungen → Safari → Kamera → Erlauben
   - Android: Einstellungen → Apps → Browser → Berechtigungen

2. **Console-Logs:**
   ```javascript
   // In BarcodeScanner.jsx, verbose: false
   // Bei Bedarf auf true setzen für Debug-Logs
   ```

3. **Fallback auf manuelle Eingabe:** Nutzer können Code tippen

### Artikel nicht gefunden
- Prüfe, ob Barcode korrekt im System ist
- Nutze `findArticlesByCodeFuzzy()` für Disambiguierung
- Option zum Neuen Artikel anlegen

### Doppelte Scans
- Automatisch verhindert durch 800ms Debounce
- `lastScanRef.current` verhindert Duplikate

---

## Code-Struktur

```
components/
├── restock/
│   ├── BarcodeScanner.jsx                 (Basis-Scanner)
│   ├── BarcodeScanner.enhanced.jsx        (Debouncing + Matching)
│   └── ScanResultModal.jsx                (Ergebnis-UI)
├── articles/
│   ├── ArticleModalWithScanning.jsx       (Editor mit Scanning)
│   └── ScanCodeBadge.jsx                  (Indikator)
└── utils/
    └── scanCodeSearch.js                  (Matching-Logik)

entities/
└── Article.json                           (barcode + qr_code Felder)

pages/
└── Restock.jsx                            (Integration)
```

---

## Zukünftige Erweiterungen

### Phase 2:
- [ ] QR-Code Generator für interne Artikel
- [ ] Bulk-Barcode-Zuordnung
- [ ] Barcode-Duplikaten-Check
- [ ] Scan-Statistiken (häufig gescannte Artikel)
- [ ] Barcode-Verlauf per Artikel

### Phase 3:
- [ ] Offline-Barcode-Cache
- [ ] Integration mit Lager/Inventory
- [ ] Automatische Bestell-Trigger bei Low-Stock
- [ ] Barcode-Labels Druck-Integration

---

## Checklist für neue Features mit Scanning

Wenn du Scanning in anderen Features integrieren möchtest:

1. **Scanner öffnen:** `BarcodeScannerEnhanced` oder `BarcodeScanner`
2. **Matching:** `findArticleByCode()` oder `findArticlesByCodeFuzzy()`
3. **UI:** `ScanResultModal` für Ergebnisse
4. **Speichern:** Artikel/Code verarbeiten via API

Beispiel:
```jsx
const [scannerOpen, setScannerOpen] = useState(false);
const handleScanResult = (article) => {
  // Deine Custom-Logik
  processArticle(article);
};

<BarcodeScannerEnhanced
  open={scannerOpen}
  onClose={() => setScannerOpen(false)}
  articles={articles}
  onArticleSelected={handleScanResult}
/>
```

---

**Letzte Aktualisierung:** 2026-04-01