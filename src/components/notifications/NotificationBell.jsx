import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function NotificationBell({ userEmail }) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => base44.entities.Notification.list('-created_date', 50),
        refetchInterval: 30000 // Alle 30 Sekunden aktualisieren
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id) => {
            const notification = notifications.find(n => n.id === id);
            const readBy = notification.read_by || [];
            if (!readBy.includes(userEmail)) {
                readBy.push(userEmail);
            }
            return base44.entities.Notification.update(id, { read_by: readBy });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const deleteNotificationMutation = useMutation({
        mutationFn: (id) => base44.entities.Notification.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const unreadNotifs = notifications.filter(n => !n.read_by?.includes(userEmail));
            for (const notif of unreadNotifs) {
                const readBy = notif.read_by || [];
                if (!readBy.includes(userEmail)) {
                    readBy.push(userEmail);
                    await base44.entities.Notification.update(notif.id, { read_by: readBy });
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const unreadCount = notifications.filter(n => !n.read_by?.includes(userEmail)).length;

    const handleNotificationClick = (notification) => {
        if (!notification.read_by?.includes(userEmail)) {
            markAsReadMutation.mutate(notification.id);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-slate-400" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Benachrichtigungen</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllAsReadMutation.mutate()}
                            className="text-xs text-blue-600 hover:text-blue-700"
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Alle gelesen
                        </Button>
                    )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Keine Benachrichtigungen</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {notifications.map(notification => {
                                const isUnread = !notification.read_by?.includes(userEmail);
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "p-4 hover:bg-slate-50 cursor-pointer transition-colors",
                                            isUnread && "bg-blue-50"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {isUnread && (
                                                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                                    )}
                                                    <p className={cn(
                                                        "text-sm",
                                                        isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {formatDistanceToNow(new Date(notification.created_date), { 
                                                        addSuffix: true, 
                                                        locale: de 
                                                    })}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotificationMutation.mutate(notification.id);
                                                }}
                                                className="h-6 w-6 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}