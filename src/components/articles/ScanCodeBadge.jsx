import React from 'react';
import { Badge } from '@/components/ui/badge';
import { QrCode, Barcode } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ScanCodeBadge — Visual indicator for barcode/QR presence
 */
export default function ScanCodeBadge({ barcode, qrCode, className }) {
  if (!barcode && !qrCode) return null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {barcode && (
        <Badge variant="secondary" className="text-xs gap-1 bg-blue-600/20 text-blue-400 border-blue-500/30">
          <Barcode className="w-3 h-3" />
          EAN
        </Badge>
      )}
      {qrCode && (
        <Badge variant="secondary" className="text-xs gap-1 bg-purple-600/20 text-purple-400 border-purple-500/30">
          <QrCode className="w-3 h-3" />
          QR
        </Badge>
      )}
    </div>
  );
}