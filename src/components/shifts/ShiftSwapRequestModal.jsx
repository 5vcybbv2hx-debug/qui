import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, RepeatIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/FrOmvmQFvvBJvqo4CJaBPA';

export default function ShiftSwapRequestModal({ shift, open, onOpenChange, onSuccess }) {
     const queryClient = useQueryClient();
     const [formData, setFormData] = useState({
         reason: ''
     });
     const [mode, setMode] = useState('marketplace'); // 'marketplace' oder 'direct'
     const [targetEmployeeId, setTargetEmployeeId] = useState('');

     const { data: employees = [] } = useQuery({
         queryKey: ['employees'],
         queryFn: () => base44.entities.Employee.filter({ is_active: true })
     });

     const { data: existingRequests = [] } = useQuery({
         queryKey: ['shift-swap-requests', shift?.id],
         queryFn: () => shift ? base44.entities.ShiftSwapRequest.filter({ 
             shift_id: shift.id,
             status: 'ausstehend' 
         }) : [],
         enabled: !!shift
     });

     const createMutation = useMutation({
         mutationFn: async (data) => {
             await base44.entities.ShiftSwapRequest.create(data);

             if (data.marketplace) {
                 // Marketplace-Anfrage: Benachrichtigung an alle Mitarbeiter
                 await base44.entities.Notification.create({
                     type: 'shift_swap_marketplace',
                     title: 'Neue Schichttausch-Anfrage im Marketplace',
                     message: `${data.requesting_employee_name} bietet die Schicht am ${format(parseISO(data.shift_date), 'dd.MM.yyyy', { locale: de })} zum Tauschen an.`,
                     related_id: shift.id,
                     read_by: []
                 });
             } else {
                 // Direkte Anfrage
                 await base44.entities.Notification.create({
                     type: 'shift_swap',
                     title: 'Neue Schichttausch-Anfrage',
                     message: `${data.requesting_employee_name} möchte die Schicht am ${format(parseISO(data.shift_date), 'dd.MM.yyyy', { locale: de })} mit ${data.target_employee_name} tauschen.`,
                     related_id: shift.id,
                     target_roles: ['admin', 'Manager'],
                     read_by: []
                 });
             }
         },
         onSuccess: () => {
             queryClient.invalidateQueries(['shift-swap-requests']);
             queryClient.invalidateQueries(['available-shift-swaps']);
             toast.success('Tauschanfrage wurde versendet');
             setFormData({ reason: '' });
             setTargetEmployeeId('');
             onSuccess?.();
         },
         onError: (error) => {
             toast.error('Fehler beim Erstellen der Anfrage: ' + error.message);
         }
     });

     const handleSubmit = (e) => {
         e.preventDefault();

         if (!formData.reason.trim()) {
             toast.error('Bitte einen Grund eingeben');
             return;
         }

         if (mode === 'direct' && !targetEmployeeId) {
             toast.error('Bitte einen Mitarbeiter wählen');
             return;
         }

         if (existingRequests.length > 0) {
             toast.error('Für diese Schicht existiert bereits eine ausstehende Tauschanfrage');
             return;
         }

         const targetEmployee = targetEmployeeId ? employees.find(e => e.id === targetEmployeeId) : null;

         if (mode === 'direct' && !targetEmployee) {
             toast.error('Mitarbeiter nicht gefunden');
             return;
         }

         createMutation.mutate({
             shift_id: shift.id,
             requesting_employee_id: shift.employee_id,
             requesting_employee_name: shift.employee_name,
             target_employee_id: targetEmployee?.id || null,
             target_employee_name: targetEmployee?.name || null,
             shift_date: shift.date,
             shift_time: `${shift.start_time} - ${shift.end_time}`,
             reason: formData.reason,
             status: 'ausstehend',
             marketplace: mode === 'marketplace'
         });
     };

     const availableEmployees = employees.filter(e => e.id !== shift?.employee_id);

    if (!shift) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RepeatIcon className="w-5 h-5 text-blue-600" />
                        Schichttausch anfragen
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-2">Deine Schicht:</p>
                        <p className="text-sm text-blue-800 font-semibold">
                            {format(parseISO(shift.date), 'EEEE, d. MMMM yyyy', { locale: de })}
                        </p>
                        <p className="text-sm text-blue-700">
                            {shift.start_time} - {shift.end_time}
                        </p>
                        {shift.shift_type && (
                            <p className="text-xs text-blue-600 mt-1">{shift.shift_type}</p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                         {/* Mode Selection */}
                         <div className="space-y-2">
                             <Label>Wie möchtest du die Schicht anbieten? *</Label>
                             <div className="flex gap-2">
                                 <button
                                     type="button"
                                     onClick={() => setMode('marketplace')}
                                     className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                         mode === 'marketplace'
                                             ? 'bg-blue-50 border-blue-500 text-blue-700'
                                             : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                     }`}
                                 >
                                     Marketplace
                                 </button>
                                 <button
                                     type="button"
                                     onClick={() => setMode('direct')}
                                     className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                         mode === 'direct'
                                             ? 'bg-blue-50 border-blue-500 text-blue-700'
                                             : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                     }`}
                                 >
                                     Direkt anfragen
                                 </button>
                             </div>
                             <p className="text-xs text-slate-500">
                                 {mode === 'marketplace'
                                     ? 'Andere Mitarbeiter können sich bewerben'
                                     : 'Direkt an einen Mitarbeiter fragen'}
                             </p>
                         </div>

                         {/* Direct Mode: Select Employee */}
                         {mode === 'direct' && (
                             <div className="space-y-2">
                                 <Label>Tauschen mit *</Label>
                                 <Select 
                                     value={targetEmployeeId} 
                                     onValueChange={setTargetEmployeeId}
                                 >
                                     <SelectTrigger>
                                         <SelectValue placeholder="Mitarbeiter wählen" />
                                     </SelectTrigger>
                                     <SelectContent>
                                         {availableEmployees.map(emp => (
                                             <SelectItem key={emp.id} value={emp.id}>
                                                 {emp.name}
                                             </SelectItem>
                                         ))}
                                     </SelectContent>
                                 </Select>
                             </div>
                         )}

                         <div className="space-y-2">
                             <Label>Grund *</Label>
                             <Textarea
                                 value={formData.reason}
                                 onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                 placeholder="Warum möchtest du diese Schicht tauschen?"
                                 required
                                 rows={4}
                                 className="resize-none"
                             />
                         </div>

                        <div className="flex gap-3 pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => onOpenChange(false)}
                                className="flex-1"
                            >
                                Abbrechen
                            </Button>
                            <Button 
                                type="submit"
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Wird gesendet...
                                    </>
                                ) : (
                                    <>
                                        <RepeatIcon className="w-4 h-4 mr-2" />
                                        Anfrage senden
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}