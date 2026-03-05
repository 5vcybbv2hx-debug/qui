import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fileTypeColors = {
  'PDF': 'bg-red-100 text-red-700',
  'DOCX': 'bg-blue-100 text-blue-700',
  'DOC': 'bg-blue-100 text-blue-700',
  'XLSX': 'bg-green-100 text-green-700',
  'XLS': 'bg-green-100 text-green-700',
  'PNG': 'bg-purple-100 text-purple-700',
  'JPG': 'bg-purple-100 text-purple-700',
  'JPEG': 'bg-purple-100 text-purple-700',
};

const getPreviewUrl = (fileUrl, fileType) => {
  if (!fileType) return null;
  
  // PDFs können in iframe angezeigt werden
  if (fileType === 'PDF') {
    return fileUrl;
  }
  
  // Bilder
  if (['PNG', 'JPG', 'JPEG'].includes(fileType)) {
    return fileUrl;
  }
  
  return null;
};

export default function DocumentViewerModal({ document, open, onClose }) {
  if (!document) return null;

  const previewUrl = getPreviewUrl(document.file_url, document.file_type);
  const isImage = ['PNG', 'JPG', 'JPEG'].includes(document.file_type);
  const isPDF = document.file_type === 'PDF';
  const isExpired = document.expiry_date && new Date(document.expiry_date) < new Date();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="text-white text-lg">{document.name}</DialogTitle>
            {document.description && (
              <p className="text-xs text-slate-400 mt-1">{document.description}</p>
            )}
          </div>
          <DialogClose className="text-slate-400 hover:text-white" />
        </DialogHeader>

        {/* Metadata */}
        <div className="px-6 space-y-3 border-b border-slate-700 pb-4">
          <div className="flex flex-wrap gap-2">
            {document.file_type && (
              <Badge className={cn("text-xs px-2", fileTypeColors[document.file_type] || 'bg-slate-100 text-slate-700')}>
                {document.file_type}
              </Badge>
            )}
            {document.category && (
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                {document.category}
              </Badge>
            )}
            {isExpired && (
              <Badge className="bg-red-600 text-white text-xs">Abgelaufen</Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-400">
            {document.file_size && (
              <div>
                <span className="font-semibold">Größe:</span> {(document.file_size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
            {document.linked_entity_name && (
              <div>
                <span className="font-semibold">Verknüpfung:</span> {document.linked_entity_type}: {document.linked_entity_name}
              </div>
            )}
            <div>
              <span className="font-semibold">Hochgeladen:</span> {format(new Date(document.created_date), 'd. MMM yyyy', { locale: de })}
            </div>
            {document.expiry_date && (
              <div>
                <span className="font-semibold">Läuft ab:</span> {format(new Date(document.expiry_date), 'd. MMM yyyy', { locale: de })}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto px-6 py-4 flex items-center justify-center">
          {previewUrl ? (
            isImage ? (
              <div className="max-w-full max-h-full">
                <img
                  src={previewUrl}
                  alt={document.name}
                  className="max-w-full max-h-[600px] object-contain mx-auto rounded"
                  onError={() => {
                    // Fallback wenn Bild nicht lädt
                  }}
                />
              </div>
            ) : isPDF ? (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                className="w-full h-full rounded"
                title={document.name}
                style={{ minHeight: '600px' }}
              />
            ) : null
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-center">
              <div>
                <p className="font-semibold mb-2">Vorschau nicht verfügbar</p>
                <p className="text-sm">Laden Sie die Datei herunter, um sie zu öffnen</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => window.open(document.file_url, '_blank')}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            In neuem Tab öffnen
          </Button>
          <a
            href={document.file_url}
            download
            className="inline-flex items-center justify-center px-4 h-9 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Herunterladen
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}