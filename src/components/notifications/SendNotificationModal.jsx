import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function SendNotificationModal() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        type: 'general',
        title: '',
        message: '',
        targetRoles: [],
        sendPush: false
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const createNotificationMutation = useMutation({
        mutationFn: async (data) => {
            // Erstelle Benachrichtigung in der Datenbank
            const notification = await base44.entities.Notification.create({
                type: data.type,
                title: data.title,
                message: data.message,
                target_roles: data.targetRoles.length > 0 ? data.targetRoles : undefined
            });

            // Wenn Push aktiviert ist, sende Push-Benachrichtigung
            if (data.sendPush) {
                try {
                    await base44.functions.invoke('sendPushNotification', {
                        title: data.title,
                        body: data.message,
                        target_roles: data.targetRoles.length > 0 ? data.targetRoles : null
                    });
                } catch (error) {
                    console.error('Push notification error:', error);
                    toast.error('Benachrichtigung erstellt, aber Push-Versand fehlgeschlagen');
                }
            }

            return notification;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            toast.success('Benachrichtigung gesendet');
            setOpen(false);
            setFormData({
                type: 'general',
                title: '',
                message: '',
                targetRoles: [],
                sendPush: false
            });
        },
        onError: () => {
            toast.error('Fehler beim Senden der Benachrichtigung');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.message) {
            toast.error('Bitte alle Felder ausfüllen');
            return;
        }

        createNotificationMutation.mutate(formData);
    };

    const toggleRole = (role) => {
        setFormData(prev => ({
            ...prev,
            targetRoles: prev.targetRoles.includes(role)
                ? prev.targetRoles.filter(r => r !== role)
                : [...prev.targetRoles, role]
        }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                    <Send className="w-4 h-4 mr-2" />
                    Neue Benachrichtigung
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-500" />
                        Benachrichtigung senden
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Typ</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">Allgemein</SelectItem>
                                <SelectItem value="alert">Warnung</SelectItem>
                                <SelectItem value="success">Erfolg</SelectItem>
                                <SelectItem value="task">Aufgabe</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Titel</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="z.B. Wichtige Ankündigung"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Nachricht</Label>
                        <Textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Deine Nachricht..."
                            rows={4}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Empfänger</Label>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="role-all"
                                    checked={formData.targetRoles.length === 0}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setFormData({ ...formData, targetRoles: [] });
                                        }
                                    }}
                                />
                                <label htmlFor="role-all" className="text-sm text-slate-700 cursor-pointer">
                                    Alle Mitarbeiter
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="role-manager"
                                    checked={formData.targetRoles.includes('Manager')}
                                    onCheckedChange={() => toggleRole('Manager')}
                                />
                                <label htmlFor="role-manager" className="text-sm text-slate-700 cursor-pointer">
                                    Nur Manager
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="role-admin"
                                    checked={formData.targetRoles.includes('admin')}
                                    onCheckedChange={() => toggleRole('admin')}
                                />
                                <label htmlFor="role-admin" className="text-sm text-slate-700 cursor-pointer">
                                    Nur Admins
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Checkbox
                            id="sendPush"
                            checked={formData.sendPush}
                            onCheckedChange={(checked) => setFormData({ ...formData, sendPush: checked })}
                        />
                        <label htmlFor="sendPush" className="text-sm text-blue-800 cursor-pointer flex-1">
                            <div className="font-medium">Push-Benachrichtigung senden</div>
                            <div className="text-xs text-blue-600">An alle Benutzer, die Push aktiviert haben</div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={createNotificationMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {createNotificationMutation.isPending ? 'Wird gesendet...' : 'Senden'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}