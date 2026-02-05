import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2, Archive, ExternalLink, Calendar, Link as LinkIcon, Tag } from 'lucide-react';
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

export default function DocumentCard({ document, onDelete, onArchive, canEdit }) {
    const isExpired = document.expiry_date && new Date(document.expiry_date) < new Date();

    return (
        <Card className={cn(
            "bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all",
            isExpired && "border-red-500/50"
        )}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-amber-600/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-amber-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm mb-1 truncate">
                            {document.name}
                        </h3>
                        
                        {document.description && (
                            <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                                {document.description}
                            </p>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {document.file_type && (
                                <Badge className={cn("text-[10px] px-1.5 h-5", fileTypeColors[document.file_type] || 'bg-slate-100 text-slate-700')}>
                                    {document.file_type}
                                </Badge>
                            )}
                            {document.category && (
                                <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-slate-400 border-slate-600">
                                    {document.category}
                                </Badge>
                            )}
                        </div>

                        {/* Links & Tags */}
                        <div className="space-y-1.5 text-xs">
                            {document.linked_entity_name && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <LinkIcon className="w-3 h-3" />
                                    <span>{document.linked_entity_type}: {document.linked_entity_name}</span>
                                </div>
                            )}
                            
                            {document.tags && document.tags.length > 0 && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Tag className="w-3 h-3" />
                                    <span className="truncate">{document.tags.join(', ')}</span>
                                </div>
                            )}

                            {document.expiry_date && (
                                <div className={cn(
                                    "flex items-center gap-1.5",
                                    isExpired ? "text-red-400" : "text-slate-400"
                                )}>
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {isExpired ? 'Abgelaufen: ' : 'Läuft ab: '}
                                        {format(new Date(document.expiry_date), 'd. MMM yyyy', { locale: de })}
                                    </span>
                                </div>
                            )}

                            <div className="text-slate-500 text-[10px] mt-2">
                                Hochgeladen: {format(new Date(document.created_date), 'd. MMM yyyy', { locale: de })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 mt-3">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(document.file_url, '_blank')}
                                className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Öffnen
                            </Button>
                            <a
                                href={document.file_url}
                                download
                                className="inline-flex items-center justify-center h-7 px-2 text-xs rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <Download className="w-3 h-3" />
                            </a>
                            {canEdit && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onArchive(!document.is_archived)}
                                        className="h-7 px-2 text-amber-500 hover:text-amber-400 hover:bg-slate-700"
                                    >
                                        <Archive className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={onDelete}
                                        className="h-7 px-2 text-red-500 hover:text-red-400 hover:bg-slate-700"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}