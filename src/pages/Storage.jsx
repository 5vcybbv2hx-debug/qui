import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, MapPin, Package, Search } from 'lucide-react';
import AreaManager from '@/components/storage/AreaManager';
import ContainerManager from '@/components/storage/ContainerManager';
import LocationManager from '@/components/storage/LocationManager';

export default function Storage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState('areas'); // 'areas', 'containers', 'locations'
  const [searchTerm, setSearchTerm] = useState('');

  if (permissions.isLoading) return null;
  if (!permissions.canViewWarehouse && !permissions.isManager) return <PermissionDenied />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <MapPin className="w-6 h-6 text-amber-500" />
          Lagerplatzverwaltung
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Bereiche, Behälter und Lagerplätze verwalten</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('areas')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'areas'
              ? 'bg-amber-600 text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          Bereiche
        </button>
        <button
          onClick={() => setActiveTab('containers')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'containers'
              ? 'bg-amber-600 text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          Behälter
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'locations'
              ? 'bg-amber-600 text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          Lagerplätze
        </button>
      </div>

      {/* Content */}
      {activeTab === 'areas' && <AreaManager permissions={permissions} />}
      {activeTab === 'containers' && <ContainerManager permissions={permissions} />}
      {activeTab === 'locations' && <LocationManager permissions={permissions} />}
    </div>
  );
}