/**
 * Enhanced BarcodeScanner with Debouncing & Result Handling
 * 
 * Extends the base scanner with:
 * - Debounce to prevent duplicate scans
 * - Result callback instead of auto-close
 * - Better error recovery
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import ScanResultModal from './ScanResultModal';
import { findArticleByCode, findArticlesByCodeFuzzy } from '../utils/scanCodeSearch';

const DEBOUNCE_MS = 800; // Prevent rapid re-scans

export default function BarcodeScannerEnhanced({
  open,
  onClose,
  articles = [],
  onArticleSelected,
  onCreateNew,
}) {
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [allMatches, setAllMatches] = useState([]);

  const lastScanRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const handleScan = useCallback(
    (decodedText) => {
      const now = Date.now();

      // Debounce: ignore if same code within last 800ms
      if (
        lastScanRef.current &&
        lastScanRef.current.code === decodedText &&
        now - lastScanRef.current.time < DEBOUNCE_MS
      ) {
        return;
      }

      lastScanRef.current = { code: decodedText, time: now };

      // Clear previous debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Process after short delay (allows camera to "settle")
      debounceTimerRef.current = setTimeout(() => {
        setScanCode(decodedText);

        // Try exact match first
        const match = findArticleByCode(decodedText, articles);
        if (match) {
          setMatchResult(match);
          setAllMatches([]);
        } else {
          // Try fuzzy matches
          const fuzzy = findArticlesByCodeFuzzy(decodedText, articles);
          if (fuzzy.length > 0) {
            setMatchResult(null);
            setAllMatches(fuzzy);
          } else {
            setMatchResult(null);
            setAllMatches([]);
          }
        }

        setResultModalOpen(true);
      }, 100);
    },
    [articles]
  );

  const handleSelectArticle = useCallback(
    (article) => {
      onArticleSelected?.(article);
      setScanCode('');
      setMatchResult(null);
      setAllMatches([]);
      setResultModalOpen(false);
      onClose?.();
    },
    [onArticleSelected, onClose]
  );

  const handleCreateNew = useCallback(
    (code) => {
      onCreateNew?.(code);
      setScanCode('');
      setMatchResult(null);
      setAllMatches([]);
      setResultModalOpen(false);
      onClose?.();
    },
    [onCreateNew, onClose]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <BarcodeScanner
        open={open && !resultModalOpen}
        onClose={onClose}
        onScan={handleScan}
        title="Barcode / QR-Code scannen"
        hint="Halte den Code vor die Kamera"
      />

      <ScanResultModal
        open={resultModalOpen && open}
        onClose={() => {
          setResultModalOpen(false);
          setScanCode('');
          setMatchResult(null);
          setAllMatches([]);
        }}
        scanCode={scanCode}
        matchResult={matchResult}
        allMatches={allMatches}
        onSelectArticle={handleSelectArticle}
        onCreateNew={handleCreateNew}
      />
    </>
  );
}