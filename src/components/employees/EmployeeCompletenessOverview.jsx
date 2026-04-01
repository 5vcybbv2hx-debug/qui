import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { calculateCompletion, getCompletionStatus, getMissingFields, isComplete } from '@/lib/employeeCompleteness';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Search, ChevronRight } from 'lucide-react';

export default function EmployeeCompletenessOverview() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      return base44.entities.Employee.list('-updated_date', 100);
    }
  });

  const filteredEmployees = employees.filter(emp => {
    if (filter === 'complete') return isComplete(emp);
    if (filter === 'incomplete') return !isComplete(emp);
    return true;
  }).filter(emp => {
    if (!search) return true;
    return emp.name.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: employees.length,
    complete: employees.filter(e => isComplete(e)).length,
    incomplete: employees.filter(e => !isComplete(e)).length
  };

  const getColorClass = (completion) => {
    if (completion === 100) return 'text-green-600 dark:text-green-400';
    if (completion >= 75) return 'text-amber-600 dark:text-amber-400';
    if (completion >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBgColorClass = (completion) => {
    if (completion === 100) return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
    if (completion >= 75) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
    if (completion >= 50) return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
    return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground mt-1">Insgesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.complete}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">Vollständig</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.incomplete}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Unvollständig</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nach Name suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 bg-transparent border-0"
              />
            </div>

            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Alle ({employees.length})</TabsTrigger>
                <TabsTrigger value="complete">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Vollständig ({stats.complete})
                </TabsTrigger>
                <TabsTrigger value="incomplete">
                  <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                  Unvollständig ({stats.incomplete})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-slate-800 dark:border-t-slate-300 rounded-full animate-spin" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Keine Mitarbeiter gefunden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmployees.map(employee => {
                const completion = calculateCompletion(employee);
                const status = getCompletionStatus(employee);
                const missingFields = getMissingFields(employee);
                const missingCount = Object.values(missingFields).reduce((sum, fields) => sum + fields.length, 0);

                return (
                  <Link
                    key={employee.id}
                    to={createPageUrl('EmployeeProfile', { id: employee.id })}
                    className={cn(
                      'block p-4 rounded-lg border-2 transition-all hover:shadow-md',
                      getBgColorClass(completion)
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground truncate">{employee.name}</h3>
                          {status.status === 'complete' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          ) : (
                            <AlertCircle className={cn('w-5 h-5 shrink-0', getColorClass(completion))} />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Progress value={completion} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{completion}% vollständig</span>
                            {missingCount > 0 && (
                              <span className={cn('font-medium', getColorClass(completion))}>
                                {missingCount} Feld{missingCount !== 1 ? 'er' : ''} fehlen
                              </span>
                            )}
                          </div>
                        </div>

                        {missingCount > 0 && (
                          <div className="mt-3 p-2 rounded bg-white/50 dark:bg-black/20">
                            <p className="text-xs font-medium text-foreground mb-1">Fehlende Abschnitte:</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(missingFields).map(([section, fields]) => (
                                <span key={section} className={cn('text-xs px-2 py-1 rounded', getColorClass(completion), 'bg-white/60 dark:bg-black/40')}>
                                  {section}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}