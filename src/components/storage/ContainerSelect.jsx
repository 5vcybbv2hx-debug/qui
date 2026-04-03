import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function ContainerSelect({ areaId = '', value, onChange, className }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerType, setNewContainerType] = useState('Regal');
  const queryClient = useQueryClient();

  // Fetch area name
  const { data: area } = useQuery({
    queryKey: ['area', areaId],
    queryFn: () => areaId ? base44.entities.Area.list().then(areas => areas.find(a => a.id === areaId)) : null,
    enabled: !!areaId
  });

  // Fetch containers for this area
  const { data: containers = [], isLoading } = useQuery({
    queryKey: ['containers', areaId],
    queryFn: () => areaId ? base44.entities.Container.filter({ area_id: areaId, is_active: true }, '-order,name') : Promise.resolve([]),
    enabled: !!areaId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Container.create(data),
    onSuccess: (newContainer) => {
      queryClient.invalidateQueries({ queryKey: ['containers', areaId] });
      onChange(newContainer);
      setNewContainerName('');
      setNewContainerType('Regal');
      setShowCreateDialog(false);
    }
  });

  const handleCreate = () => {
    if (!newContainerName.trim() || !areaId || !area) return;
    createMutation.mutate({
      area_id: areaId,
      area_name: area.name,
      name: newContainerName.trim(),
      type: newContainerType,
      is_active: true
    });
  };

  const isDisabled = !areaId || isLoading;

  return (
    <>
      <div className={cn('space-y-2', className)}>
        <Label>Möbel/Behälter {areaId ? '' : '(zuerst Bereich wählen)'}</Label>
        <div className="flex gap-2">
          <Select value={value?.id || ''} onValueChange={containerId => {
            const selectedContainer = containers.find(c => c.id === containerId);
            onChange(selectedContainer || {});
          }} disabled={isDisabled}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue placeholder={isLoading ? 'Lädt...' : isDisabled ? 'Bereich wählen...' : 'Behälter wählen...'} />
            </SelectTrigger>
            <SelectContent>
              {containers.map(container => (
                <SelectItem key={container.id} value={container.id}>
                  {container.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => setShowCreateDialog(true)}
            disabled={!areaId}
            title="Neuer Behälter"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuer Behälter {area && `in "${area.name}"`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="z.B. Regal A, Schrank 1, Kiste Orange"
                value={newContainerName}
                onChange={e => setNewContainerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="h-11 text-base"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={newContainerType} onValueChange={setNewContainerType}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regal">Regal</SelectItem>
                  <SelectItem value="Schrank">Schrank</SelectItem>
                  <SelectItem value="Schublade">Schublade</SelectItem>
                  <SelectItem value="Kiste">Kiste</SelectItem>
                  <SelectItem value="Kühler">Kühler</SelectItem>
                  <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!newContainerName.trim() || createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? 'Wird erstellt...' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}