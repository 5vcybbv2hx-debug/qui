import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Search, Filter, FolderOpen, Archive } from 'lucide-react';
import { toast } from 'sonner';
import DocumentUploader from '@/components/documents/DocumentUploader';
import DocumentCard from '@/components/documents/DocumentCard';
import DocumentViewerModal from '@/components/documents/DocumentViewerModal';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

export default function DocumentsPage() {
    const [showUploader, setShowUploader] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    
    const permissions = usePermissions();
    const queryClient = useQueryClient();

    const { data: rawDocuments = [], isLoading } = useQuery({
        queryKey: ['documents'],
        queryFn: () => base44.entities.Document.list('-created_date'),
    });

    // Normalize: SDK may return data nested under .data or flat
    const documents = rawDocuments.map(doc => ({
        id: doc.id,
        created_date: doc.created_date,
        ...(doc.data ? doc.data : doc),
    }));

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Document.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success('Dokument gelöscht');
        }
    });

    const archiveMutation = useMutation({
        mutationFn: ({ id, isArchived }) => base44.entities.Document.update(id, { is_archived: isArchived }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success('Status aktualisiert');
        }
    });

    const filteredDocuments = documents.filter(doc => {
        if (!showArchived && doc.is_archived) return false;
        if (showArchived && !doc.is_archived) return false;
        
        if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !doc.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        
        if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
        if (entityFilter !== 'all' && doc.linked_entity_type !== entityFilter) return false;
        
        return true;
    });

    const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
        const category = doc.category || 'Sonstiges';
        if (!acc[category]) acc[category] = [];
        acc[category].push(doc);
        return acc;
    }, {});

    if (!permissions.isManager) {
        return <PermissionDenied />;
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <FileText className="w-8 h-8 text-amber-500" />
                            Dokumentenverwaltung
                        </h1>
                        <p className="text-slate-400">{documents.length} Dokumente gesamt</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={showArchived ? "default" : "outline"}
                            onClick={() => setShowArchived(!showArchived)}
                            className={showArchived ? "bg-amber-600" : "border-slate-600 text-slate-300"}
                        >
                            <Archive className="w-4 h-4 mr-2" />
                            {showArchived ? 'Aktive anzeigen' : 'Archiv anzeigen'}
                        </Button>
                        {permissions.isManager && (
                            <Button
                                onClick={() => setShowUploader(true)}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Dokument hochladen
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Suchen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-slate-900 border-slate-600 text-white"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                    <SelectValue placeholder="Kategorie" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Kategorien</SelectItem>
                                    <SelectItem value="Vertrag">Vertrag</SelectItem>
                                    <SelectItem value="Rechnung">Rechnung</SelectItem>
                                    <SelectItem value="Bericht">Bericht</SelectItem>
                                    <SelectItem value="Handbuch">Handbuch</SelectItem>
                                    <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={entityFilter} onValueChange={setEntityFilter}>
                                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                    <SelectValue placeholder="Verknüpfung" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Verknüpfungen</SelectItem>
                                    <SelectItem value="Employee">Mitarbeiter</SelectItem>
                                    <SelectItem value="SalesReport">Verkaufsbericht</SelectItem>
                                    <SelectItem value="Event">Event</SelectItem>
                                    <SelectItem value="Supplier">Lieferant</SelectItem>
                                    <SelectItem value="Keine">Keine</SelectItem>
                                </SelectContent>
                            </Select>
                            {(searchTerm || categoryFilter !== 'all' || entityFilter !== 'all') && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setCategoryFilter('all');
                                        setEntityFilter('all');
                                    }}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Filter zurücksetzen
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Document Uploader Modal */}
                {showUploader && (
                    <DocumentUploader
                        onClose={() => setShowUploader(false)}
                        onSuccess={() => {
                            setShowUploader(false);
                            queryClient.invalidateQueries({ queryKey: ['documents'] });
                        }}
                    />
                )}

                {/* Document Viewer Modal */}
                <DocumentViewerModal
                    document={selectedDocument}
                    open={viewerOpen}
                    onClose={() => {
                        setViewerOpen(false);
                        setSelectedDocument(null);
                    }}
                />

                {/* Documents Grid */}
                {isLoading ? (
                    <div className="text-center py-12 text-slate-400">Lädt...</div>
                ) : filteredDocuments.length === 0 ? (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="py-12 text-center">
                            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">
                                {documents.length === 0 
                                    ? 'Noch keine Dokumente hochgeladen' 
                                    : 'Keine Dokumente gefunden'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedDocuments).map(([category, docs]) => (
                            <div key={category}>
                                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <FolderOpen className="w-5 h-5 text-amber-500" />
                                    {category}
                                    <span className="text-sm text-slate-400 font-normal">({docs.length})</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {docs.map(doc => (
                                        <DocumentCard
                                            key={doc.id}
                                            document={doc}
                                            onDelete={() => deleteMutation.mutate(doc.id)}
                                            onArchive={(isArchived) => archiveMutation.mutate({ id: doc.id, isArchived })}
                                            canEdit={permissions.isManager}
                                            onView={(document) => {
                                                setSelectedDocument(document);
                                                setViewerOpen(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}