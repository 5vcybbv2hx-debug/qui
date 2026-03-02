import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Bell, CheckCircle2, Trash2, Eye, Filter, AlertCircle, Info, CheckSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/components/auth/usePermissions';
import SendNotificationModal from '@/components/notifications/SendNotificationModal';

const typeIcons = {
    'general': Info,
    'alert': AlertCircle,
    'success': CheckCircle2,
    'task': CheckSquare
};

const typeColors = {
    'general': 'bg-blue-100 text-blue-700',
    'alert': 'bg-red-100 text-red-700',
    'success': 'bg-green-100 text-green-700',
    'task': 'bg-amber-100 text-amber-700'
};

export default function Notifications() {
     const queryClient = useQueryClient();
     const permissions = usePermissions();
     const [filter, setFilter] = useState('all');
     const [currentUser, setCurrentUser] = useState(null);
     const [selectedIds, setSelectedIds] = useState(new Set());

    React.useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => base44.entities.Notification.list('-created_date')
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId) => {
            const notification = notifications.find(n => n.id === notificationId);
            const readBy = notification.read_by || [];
            if (!readBy.includes(currentUser.email)) {
                await base44.entities.Notification.update(notificationId, {
                    read_by: [...readBy, currentUser.email]
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const unreadNotifications = visibleNotifications.filter(n => 
                !n.read_by?.includes(currentUser.email)
            );
            const promises = unreadNotifications.map(n => {
                const readBy = n.read_by || [];
                return base44.entities.Notification.update(n.id, {
                    read_by: [...readBy, currentUser.email]
                });
            });
            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const deleteAllReadMutation = useMutation({
         mutationFn: async () => {
             const readNotifications = visibleNotifications.filter(n => 
                 n.read_by?.includes(currentUser.email)
             );
             const promises = readNotifications.map(n => 
                 base44.entities.Notification.delete(n.id)
             );
             return Promise.all(promises);
         },
         onSuccess: () => {
             queryClient.invalidateQueries(['notifications']);
         }
     });

     const bulkDeleteMutation = useMutation({
         mutationFn: async () => {
             const promises = Array.from(selectedIds).map(id => 
                 base44.entities.Notification.delete(id)
             );
             return Promise.all(promises);
         },
         onSuccess: () => {
             setSelectedIds(new Set());
             queryClient.invalidateQueries(['notifications']);
         }
     });

     const toggleSelection = (notificationId) => {
         const newSelected = new Set(selectedIds);
         if (newSelected.has(notificationId)) {
             newSelected.delete(notificationId);
         } else {
             newSelected.add(notificationId);
         }
         setSelectedIds(newSelected);
     };

     const toggleSelectAll = () => {
         if (selectedIds.size === filteredNotifications.length) {
             setSelectedIds(new Set());
         } else {
             setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
         }
     };

    if (!currentUser) return null;

    // Filter notifications based on user role and permissions
     const visibleNotifications = notifications.filter(notification => {
         // If target_roles is empty or undefined, show to everyone
         if (!notification.target_roles || notification.target_roles.length === 0) {
             return true;
         }
         // Otherwise check if user's role matches exactly
         const userRole = permissions.isManager ? 'Manager' : 'user';
         return notification.target_roles.includes(userRole);
     });

    const filteredNotifications = visibleNotifications.filter(notification => {
        if (filter === 'unread') {
            return !notification.read_by?.includes(currentUser.email);
        }
        if (filter === 'read') {
            return notification.read_by?.includes(currentUser.email);
        }
        return true;
    });

    const unreadCount = visibleNotifications.filter(n => !n.read_by?.includes(currentUser.email)).length;

    return (
        <div className="min-h-screen bg-slate-900 pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <Bell className="w-8 h-8 text-amber-400" />
                            <div>
                                     <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">Benachrichtigungen</h1>
                                <p className="text-slate-400 text-sm">
                                    Alle wichtigen Updates an einem Ort
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <Badge className="bg-red-600 text-white">
                                    {unreadCount} neu
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {permissions.isManager && <SendNotificationModal />}
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="mb-6 space-y-4">
                    <Tabs value={filter} onValueChange={setFilter}>
                         <TabsList className="grid grid-cols-3 w-full bg-slate-800 border-slate-700">
                             <TabsTrigger value="all" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black text-slate-300">
                                 Alle ({visibleNotifications.length})
                             </TabsTrigger>
                             <TabsTrigger value="unread" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black text-slate-300">
                                 Ungelesen ({unreadCount})
                             </TabsTrigger>
                             <TabsTrigger value="read" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black text-slate-300">
                                 Gelesen ({visibleNotifications.length - unreadCount})
                             </TabsTrigger>
                         </TabsList>
                     </Tabs>
                    
                    <div className="flex flex-wrap gap-2 items-center">
                         {filteredNotifications.length > 0 && (
                             <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer text-sm text-slate-300">
                                 <Checkbox 
                                     checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                                     onCheckedChange={toggleSelectAll}
                                 />
                                 Alle auswählen
                             </label>
                         )}

                         {selectedIds.size > 0 && (
                             <Button
                                 onClick={() => {
                                     if (confirm(`${selectedIds.size} Benachrichtigung(en) löschen?`)) {
                                         bulkDeleteMutation.mutate();
                                     }
                                 }}
                                 variant="outline"
                                 size="sm"
                                 disabled={bulkDeleteMutation.isPending}
                                 className="border-red-600 text-red-400 hover:bg-red-950"
                             >
                                 <Trash2 className="w-4 h-4 mr-2" />
                                 {selectedIds.size} löschen
                             </Button>
                         )}

                         {(unreadCount > 0 || filteredNotifications.some(n => n.read_by?.includes(currentUser.email))) && selectedIds.size === 0 && (
                             <>
                                 {unreadCount > 0 && (
                                     <Button
                                         onClick={() => markAllAsReadMutation.mutate()}
                                         variant="outline"
                                         size="sm"
                                         disabled={markAllAsReadMutation.isPending}
                                         className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                     >
                                         <CheckCircle2 className="w-4 h-4 mr-2" />
                                         Alle als gelesen markieren
                                     </Button>
                                 )}
                                 {filteredNotifications.some(n => n.read_by?.includes(currentUser.email)) && (
                                     <Button
                                         onClick={() => {
                                             if (confirm('Alle gelesenen Benachrichtigungen löschen?')) {
                                                 deleteAllReadMutation.mutate();
                                             }
                                         }}
                                         variant="outline"
                                         size="sm"
                                         disabled={deleteAllReadMutation.isPending}
                                         className="border-red-600 text-red-400 hover:bg-red-950"
                                     >
                                         <Trash2 className="w-4 h-4 mr-2" />
                                         Gelesene löschen
                                     </Button>
                                 )}
                             </>
                         )}
                     </div>
                </div>

                {/* Notifications List */}
                <div className="space-y-3">
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map(notification => {
                            const isRead = notification.read_by?.includes(currentUser.email);
                            const TypeIcon = typeIcons[notification.type] || Info;
                            
                            return (
                                <Card 
                                    key={notification.id} 
                                    className={cn(
                                        "p-4 border-slate-700 transition-all",
                                        isRead ? "bg-slate-800/50" : "bg-slate-800 border-l-4 border-l-amber-500"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "p-2 rounded-lg shrink-0",
                                            isRead ? "bg-slate-700" : "bg-amber-900/30"
                                        )}>
                                            <TypeIcon className={cn(
                                                "w-5 h-5",
                                                isRead ? "text-slate-400" : "text-amber-400"
                                            )} />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className={cn(
                                                    "font-semibold text-sm",
                                                    isRead ? "text-slate-400" : "text-white"
                                                )}>
                                                    {notification.title}
                                                </h3>
                                                {notification.type && (
                                                    <Badge className={cn(
                                                        "text-xs shrink-0",
                                                        typeColors[notification.type]
                                                    )}>
                                                        {notification.type}
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <p className={cn(
                                                "text-sm mb-2",
                                                isRead ? "text-slate-500" : "text-slate-300"
                                            )}>
                                                {notification.message}
                                            </p>
                                            
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>
                                                    {format(parseISO(notification.created_date), 'dd. MMM yyyy, HH:mm', { locale: de })}
                                                </span>
                                                {isRead && (
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Gelesen
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-1 shrink-0">
                                            {!isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => markAsReadMutation.mutate(notification.id)}
                                                    className="text-slate-400 hover:text-white h-8 w-8"
                                                    title="Als gelesen markieren"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (confirm('Benachrichtigung löschen?')) {
                                                        deleteMutation.mutate(notification.id);
                                                    }
                                                }}
                                                className="text-red-400 hover:text-red-300 h-8 w-8"
                                                title="Löschen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <Card className="p-12 bg-slate-800 border-slate-700">
                            <div className="text-center text-slate-400">
                                <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium mb-1">
                                    {filter === 'unread' ? 'Keine ungelesenen Benachrichtigungen' :
                                     filter === 'read' ? 'Keine gelesenen Benachrichtigungen' :
                                     'Keine Benachrichtigungen'}
                                </p>
                                <p className="text-sm">
                                    Hier werden wichtige Updates und Ereignisse angezeigt
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}