import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import EmployeeDeleteDialog from '@/components/employees/EmployeeDeleteDialog';
import WorkTimeModelsManager from '@/components/employees/WorkTimeModelsManager';
import PersonalFormDigital from '@/components/employees/PersonalFormDigital';
import PersonalFormUploader from '@/components/employees/PersonalFormUploader';
import EmployeesCSVExport from '@/components/employees/EmployeesCSVExport';
import PDFExportButton from '@/components/export/PDFExportButton';
import { ListSkeleton } from '@/components/ui/StateDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Plus, Search, Phone, MessageCircle, Archive,
  ChevronRight, Users, AlertCircle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createNotification } from '@/utils/createNotification';

const roleColors = {
  'Aushilfe': 'bg-muted/80 text-muted-foreground border border-border',
  'Vollzeit':  'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  'Manager':   'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  'Teilzeit':  'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
};

const SKILLS = ['Barkeeper', 'Service', 'Sonderaufgaben'];

export default function Employees() {
  const permissions  = usePermissions();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const [search,       setSearch]       = useState('');
  const [skillFilter,  setSkillFilter]  = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('name', 500),
    staleTime: STALE.MEDIUM,
  });

  const { data: companyInfo } = useQuery({
    queryKey: ['company-info'],
    queryFn: async () => { const r = await base44.entities.CompanyInfo.list('-last_updated', 1); return r?.[0] || null; },
    staleTime: STALE.SLOW,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    staleTime: STALE.SLOW,
  });

  // ── Derived lists ─────────────────────────────────────────────────────────
  const active = useMemo(() =>
    employees.filter(e => {
      if (e.is_active === false) return false;
      const q = search.toLowerCase();
      const matchSearch = !search
        || (e.name || '').toLowerCase().includes(q)
        || (e.role || '').toLowerCase().includes(q)
        || (e.email || '').toLowerCase().includes(q);
      const matchSkills = skillFilter.length === 0 || skillFilter.every(s => e.skills?.includes(s));
      return matchSearch && matchSkills;
    }),
    [employees, search, skillFilter]
  );

  const inactive = useMemo(() => employees.filter(e => e.is_active === false), [employees]);
  const missingEmail = useMemo(() => active.filter(e => !e.email), [active]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleSkill = s => setSkillFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleInvite = async (employee) => {
    try {
      await base44.auth.sendMagicLink({ email: employee.email });
      await createNotification({ type: 'invite_sent', title: 'Einladung gesendet', message: `${employee.name} wurde zur App eingeladen.`, relatedId: employee.id });
      toast.success(`Einladung an ${employee.name} gesendet`);
    } catch {
      toast.error('Einladung fehlgeschlagen');
    }
  };

  // ── Permission guard ──────────────────────────────────────────────────────
  if (permissions.isLoading) return (
    <div className="max-w-4xl mx-auto px-3 py-6 space-y-3">
      <div className="h-10 rounded-xl animate-shimmer bg-muted" />
      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl animate-shimmer bg-muted" style={{ '--delay': `${i * 60}ms` }} />
        ))}
      </div>
    </div>
  );

  if (!permissions.canViewEmployees) return <PermissionDenied />;

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 pb-28 md:pb-8">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Mitarbeiter
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">{active.length} aktiv</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {companyInfo?.whatsapp_group_link && (
            <a
              href={companyInfo.whatsapp_group_link}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Team-Gruppe</span>
            </a>
          )}
          {permissions.isManager && (
            <>
              <WorkTimeModelsManager />
              <PersonalFormDigital onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })} />
              <PersonalFormUploader onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })} />
              <EmployeesCSVExport employees={active} />
              <PDFExportButton
                data={active}
                filename="mitarbeiter"
                title="Mitarbeiterliste"
                columns={[
                  { label: 'Name', field: 'name' },
                  { label: 'Rolle', field: 'role' },
                  { label: 'Vertrag', field: 'contract_type' },
                  { label: 'Stundensatz', render: e => e.hourly_rate ? `${e.hourly_rate} €` : '-' },
                  { label: 'Email', field: 'email' },
                ]}
              />
              <Button
                onClick={() => navigate('/EmployeeProfile/new')}
                className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Hinzufügen</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Search & Filter ──────────────────────────────────────────── */}
      <div className="space-y-2 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10 h-11"
            placeholder="Name, Rolle oder E-Mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {permissions.isManager && (
          <div className="flex gap-2 flex-wrap">
            {SKILLS.map(s => (
              <button
                key={s}
                onClick={() => toggleSkill(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all min-h-[36px]',
                  skillFilter.includes(s)
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Missing-email alert ──────────────────────────────────────── */}
      {permissions.isManager && missingEmail.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">
              {missingEmail.length} Mitarbeiter ohne E-Mail
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {missingEmail.map(e => e.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Employee list ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-shimmer bg-muted" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Mitarbeiter gefunden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((emp, idx) => {
            const isOwn = currentUser?.email === emp.email;
            return (
              <Card
                key={emp.id}
                className="p-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors cursor-pointer card-pressable animate-stagger"
                style={{ '--delay': `${idx * 35}ms` }}
                onClick={() => navigate(`/EmployeeProfile/${emp.id}`)}
              >
                {/* Avatar */}
                <EmployeeAvatar employee={emp} size="sm" className="shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{emp.name}</p>
                    {isOwn && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 font-medium shrink-0">
                        Ich
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge className={cn('text-[10px] px-1.5 py-0', roleColors[emp.role] || 'bg-muted text-muted-foreground')}>
                      {emp.role}
                    </Badge>
                    {emp.skills?.map(s => (
                      <span key={s} className="text-[10px] text-muted-foreground/70">· {s}</span>
                    ))}
                  </div>
                </div>

                {/* Quick contact (stops propagation) */}
                <div className="flex items-center gap-1 shrink-0">
                  {emp.phone && (
                    <>
                      <a
                        href={`tel:${emp.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Anrufen"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-1" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Ehemalige ───────────────────────────────────────────────── */}
      {permissions.isManager && inactive.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowInactive(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-card transition-all text-sm font-medium w-full mb-3"
          >
            <Archive className="w-4 h-4" />
            Ehemalige ({inactive.length})
            <span className="ml-auto text-xs">{showInactive ? '▲' : '▼'}</span>
          </button>
          {showInactive && (
            <div className="space-y-2">
              {inactive.map(emp => (
                <Card
                  key={emp.id}
                  className="p-3 flex items-center gap-3 opacity-50 cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => navigate(`/EmployeeProfile/${emp.id}`)}
                >
                  <EmployeeAvatar employee={emp} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role} · Ehemals</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete dialog */}
      {deleteTarget && (
        <EmployeeDeleteDialog
          employee={deleteTarget}
          currentUser={currentUser}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
