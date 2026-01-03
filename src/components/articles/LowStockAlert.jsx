import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function LowStockAlert({ articles }) {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <Button 
                onClick={() => setModalOpen(true)}
                variant="outline"
                className="border-red-600 hover:bg-red-950 text-red-400"
            >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {articles.length} niedrig
            </Button>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Niedriger Lagerbestand
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 mt-4">
                        {articles.map(article => (
                            <Card key={article.id} className="p-3 bg-red-50 border-red-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900 text-sm">{article.name}</p>
                                        <p className="text-xs text-slate-600 font-mono mt-0.5">{article.barcode}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge className="bg-red-100 text-red-700 text-xs">
                                                Bestand: {article.current_stock}
                                            </Badge>
                                            <span className="text-xs text-slate-500">
                                                Min: {article.min_stock}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}