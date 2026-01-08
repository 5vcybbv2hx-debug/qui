import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Upload, Trash2, Receipt } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import BudgetModal from '@/components/budget/BudgetModal';
import ExpenseModal from '@/components/budget/ExpenseModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CATEGORY_COLORS = {
    'Einkauf': '#3b82f6',
    'Personal': '#8b5cf6',
    'Marketing': '#ec4899',
    'Wartung': '#f59e0b',
    'Events': '#10b981',
    'Sonstiges': '#64748b'
};

export default function Budget() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [selectedExpense, setSelectedExpense] = useState(null);

    const monthStr = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');

    const { data: budgets = [] } = useQuery({
        queryKey: ['budgets', monthStr],
        queryFn: () => base44.entities.Budget.filter({ month: monthStr })
    });

    const { data: expenses = [] } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => base44.entities.Expense.list('-date', 500)
    });

    const { data: shoppingList = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list()
    });

    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries-all'],
        queryFn: () => base44.entities.TimeEntry.list('-date')
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list()
    });

    const deleteBudgetMutation = useMutation({
        mutationFn: (id) => base44.entities.Budget.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['budgets'])
    });

    const deleteExpenseMutation = useMutation({
        mutationFn: (id) => base44.entities.Expense.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['expenses'])
    });

    if (!permissions.isManager) {
        return <PermissionDenied message="Nur Manager haben Zugriff auf Budget-Verwaltung." />;
    }

    // Calculate expenses for selected month
    const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
    const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);

    // Calculate shopping costs
    const receivedItems = shoppingList.filter(item => item.status === 'erhalten');
    const shoppingCosts = receivedItems.reduce((sum, item) => {
        const article = item.item_name;
        // Simplified cost estimation
        return sum + (item.quantity * 5); // Placeholder
    }, 0);

    // Calculate personnel costs
    const monthTimeEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd && e.status === 'genehmigt');
    const personnelCosts = monthTimeEntries.reduce((sum, entry) => {
        const emp = employees.find(e => e.id === entry.employee_id);
        return sum + ((entry.total_hours || 0) * (emp?.hourly_rate || 0));
    }, 0);

    // Group expenses by category
    const expensesByCategory = monthExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
    }, {});

    // Budget overview data
    const budgetOverview = budgets.map(budget => {
        const spent = expensesByCategory[budget.category] || 0;
        const percentage = (spent / budget.planned_amount) * 100;
        
        return {
            category: budget.category,
            budget: budget.planned_amount,
            spent: spent,
            remaining: budget.planned_amount - spent,
            percentage: percentage,
            budgetId: budget.id
        };
    });

    // Chart data
    const chartData = budgetOverview.map(item => ({
        name: item.category,
        Geplant: item.budget,
        Ausgegeben: item.spent
    }));

    const pieData = budgetOverview.map(item => ({
        name: item.category,
        value: item.spent
    }));

    const totalBudget = budgets.reduce((sum, b) => sum + b.planned_amount, 0);
    const totalSpent = Object.values(expensesByCategory).reduce((sum, v) => sum + v, 0);

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Budget & Kosten</h1>
                    <p className="text-slate-400 text-sm mt-1">Finanzübersicht und Budgetverwaltung</p>
                </div>

                {/* Month Selector */}
                <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const newDate = new Date(selectedMonth);
                                newDate.setMonth(newDate.getMonth() - 1);
                                setSelectedMonth(newDate);
                            }}
                            className="border-slate-600 hover:bg-slate-700 text-slate-300"
                        >
                            ← Vorheriger Monat
                        </Button>
                        <div className="flex items-center gap-2 text-white">
                            <Calendar className="w-5 h-5 text-amber-400" />
                            <span className="font-semibold">{format(selectedMonth, 'MMMM yyyy', { locale: de })}</span>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const newDate = new Date(selectedMonth);
                                newDate.setMonth(newDate.getMonth() + 1);
                                setSelectedMonth(newDate);
                            }}
                            className="border-slate-600 hover:bg-slate-700 text-slate-300"
                        >
                            Nächster Monat →
                        </Button>
                    </div>
                </Card>

                {/* Summary Cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Gesamtbudget</p>
                                <p className="text-2xl font-bold text-white">{totalBudget.toFixed(0)}€</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Ausgegeben</p>
                                <p className="text-2xl font-bold text-white">{totalSpent.toFixed(0)}€</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Verfügbar</p>
                                <p className="text-2xl font-bold text-white">{(totalBudget - totalSpent).toFixed(0)}€</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-2 gap-6 mb-6">
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <h3 className="font-semibold text-white mb-4">Budget vs. Ausgaben</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                    labelStyle={{ color: '#f1f5f9' }}
                                />
                                <Legend />
                                <Bar dataKey="Geplant" fill="#3b82f6" />
                                <Bar dataKey="Ausgegeben" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <h3 className="font-semibold text-white mb-4">Ausgabenverteilung</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={index} fill={CATEGORY_COLORS[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </div>

                {/* Budget Categories */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Budgetkategorien</h2>
                        <Button onClick={() => setBudgetModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Budget erstellen
                        </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {budgetOverview.map((item) => (
                            <Card key={item.budgetId} className="p-4 bg-slate-800 border-slate-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-semibold text-white mb-1">{item.category}</h4>
                                        <p className="text-sm text-slate-400">
                                            {item.spent.toFixed(2)}€ / {item.budget.toFixed(2)}€
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteBudgetMutation.mutate(item.budgetId)}
                                        className="h-8 w-8 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Progress 
                                    value={Math.min(item.percentage, 100)} 
                                    className="h-2 mb-2"
                                />
                                <div className="flex items-center justify-between text-sm">
                                    <Badge className={
                                        item.percentage > 100 ? 'bg-red-100 text-red-700' :
                                        item.percentage > 80 ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700'
                                    }>
                                        {item.percentage.toFixed(0)}%
                                    </Badge>
                                    <span className="text-slate-400">
                                        {item.remaining.toFixed(2)}€ übrig
                                    </span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Expenses List */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Ausgaben</h2>
                        <Button 
                            onClick={() => {
                                setSelectedExpense(null);
                                setExpenseModalOpen(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Ausgabe erfassen
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {monthExpenses.map(expense => (
                            <Card key={expense.id} className="p-4 bg-slate-800 border-slate-700">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-semibold text-white">{expense.title}</h4>
                                            <Badge style={{ 
                                                backgroundColor: CATEGORY_COLORS[expense.category] + '20',
                                                color: CATEGORY_COLORS[expense.category]
                                            }}>
                                                {expense.category}
                                            </Badge>
                                            {expense.auto_generated && (
                                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                                    Auto
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <span>{format(new Date(expense.date), 'dd.MM.yyyy')}</span>
                                            <span className="font-semibold text-amber-400 text-lg">
                                                {expense.amount.toFixed(2)}€
                                            </span>
                                        </div>
                                        {expense.notes && (
                                            <p className="text-sm text-slate-500 mt-2">{expense.notes}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {expense.receipt_url && (
                                            <a
                                                href={expense.receipt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-slate-400 hover:text-slate-300"
                                            >
                                                <Receipt className="w-4 h-4" />
                                            </a>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteExpenseMutation.mutate(expense.id)}
                                            className="h-8 w-8 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {monthExpenses.length === 0 && (
                            <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                                <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                <p className="text-slate-400">Keine Ausgaben für diesen Monat</p>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Modals */}
                <BudgetModal
                    open={budgetModalOpen}
                    onClose={() => setBudgetModalOpen(false)}
                    selectedMonth={selectedMonth}
                />

                <ExpenseModal
                    open={expenseModalOpen}
                    onClose={() => setExpenseModalOpen(false)}
                    expense={selectedExpense}
                />
            </div>
        </div>
    );
}