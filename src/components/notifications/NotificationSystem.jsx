// Notification System: Push, Email, In-App mit Delivery-Tracking
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  REMINDER: 'reminder'
};

const DELIVERY_CHANNELS = {
  IN_APP: 'in_app',
  PUSH: 'push',
  EMAIL: 'email'
};

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.deliveryQueue = [];
  }

  // Erstelle Benachrichtigung
  create(notification) {
    const id = `notif_${Date.now()}_${Math.random()}`;
    const notif = {
      id,
      createdAt: new Date(),
      readAt: null,
      status: 'pending',
      deliveryChannels: notification.channels || [DELIVERY_CHANNELS.IN_APP],
      ...notification
    };

    this.notifications.push(notif);
    this.notifyListeners('create', notif);
    
    // Queue für Delivery
    this.queueDelivery(notif);

    return notif;
  }

  // Queue Delivery für verschiedene Kanäle
  queueDelivery(notification) {
    notification.deliveryChannels.forEach(channel => {
      this.deliveryQueue.push({
        notificationId: notification.id,
        channel,
        status: 'pending',
        attempts: 0,
        maxRetries: 3
      });
    });
  }

  // Sende via verschiedene Kanäle
  async deliverNotification(notification, channel) {
    try {
      switch (channel) {
        case DELIVERY_CHANNELS.PUSH:
          await this.sendPush(notification);
          break;
        case DELIVERY_CHANNELS.EMAIL:
          await this.sendEmail(notification);
          break;
        case DELIVERY_CHANNELS.IN_APP:
          // In-App wird lokal handled
          break;
      }

      return { success: true, channel };
    } catch (error) {
      return { success: false, channel, error: error.message };
    }
  }

  async sendPush(notification) {
    // Browser Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
        badge: '/badge.png'
      });
    }
  }

  async sendEmail(notification) {
    // Via Base44 Backend Function
    return base44.integrations.Core.SendEmail({
      to: notification.recipient,
      subject: notification.title,
      body: notification.message
    });
  }

  // Markiere als gelesen
  markAsRead(notificationId) {
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.readAt = new Date();
      notif.status = 'read';
      this.notifyListeners('read', notif);
    }
  }

  // Markiere alle als gelesen
  markAllAsRead() {
    this.notifications.forEach(notif => {
      if (!notif.readAt) {
        notif.readAt = new Date();
        notif.status = 'read';
      }
    });
    this.notifyListeners('mark_all_read', null);
  }

  // Lösche Benachrichtigung
  delete(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners('delete', { id: notificationId });
  }

  // Filter & Stats
  getUnread() {
    return this.notifications.filter(n => !n.readAt);
  }

  getByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  getStats() {
    return {
      total: this.notifications.length,
      unread: this.getUnread().length,
      byType: Object.values(NOTIFICATION_TYPES).reduce((acc, type) => {
        acc[type] = this.getByType(type).length;
        return acc;
      }, {}),
      deliveryPending: this.deliveryQueue.filter(d => d.status === 'pending').length
    };
  }

  // Subscribe zu Änderungen
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback({ event, data }));
  }

  clear() {
    this.notifications = [];
    this.deliveryQueue = [];
    this.notifyListeners('clear', null);
  }
}

const notificationManager = new NotificationManager();

// React Hook
export function useNotifications() {
  const [notifications, setNotifications] = useState(notificationManager.notifications);
  const [stats, setStats] = useState(notificationManager.getStats());

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(() => {
      setNotifications([...notificationManager.notifications]);
      setStats(notificationManager.getStats());
    });

    return unsubscribe;
  }, []);

  const addNotification = useCallback((notification) => {
    return notificationManager.create(notification);
  }, []);

  const markAsRead = useCallback((id) => {
    notificationManager.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationManager.markAllAsRead();
  }, []);

  const deleteNotification = useCallback((id) => {
    notificationManager.delete(id);
  }, []);

  return {
    notifications,
    stats,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clear: () => notificationManager.clear()
  };
}

// Helper: Schnelle Notifikationen
export function useQuickNotification() {
  const { addNotification } = useNotifications();

  return {
    info: (title, message, channels = [DELIVERY_CHANNELS.IN_APP]) =>
      addNotification({ type: NOTIFICATION_TYPES.INFO, title, message, channels }),
    
    success: (title, message, channels = [DELIVERY_CHANNELS.IN_APP]) =>
      addNotification({ type: NOTIFICATION_TYPES.SUCCESS, title, message, channels }),
    
    warning: (title, message, channels = [DELIVERY_CHANNELS.IN_APP]) =>
      addNotification({ type: NOTIFICATION_TYPES.WARNING, title, message, channels }),
    
    error: (title, message, channels = [DELIVERY_CHANNELS.IN_APP]) =>
      addNotification({ type: NOTIFICATION_TYPES.ERROR, title, message, channels }),
    
    reminder: (title, message, channels = [DELIVERY_CHANNELS.PUSH]) =>
      addNotification({ type: NOTIFICATION_TYPES.REMINDER, title, message, channels })
  };
}

export { NotificationManager, notificationManager, NOTIFICATION_TYPES, DELIVERY_CHANNELS };