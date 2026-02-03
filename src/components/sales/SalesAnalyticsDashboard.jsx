import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Award, AlertTriangle, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function SalesAnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState('30');

    const { data: reports = [] } = useQuery({
        queryKey: ['sales-reports'],
        queryFn: () => base44.entities.SalesReport.filter({ processing_status: 'completed' }, '-report_date'),
        initialData: []
    });

    const { data: salesData = [] } = useQuery({
        queryKey: ['sales-data'],
        queryFn: () => base44.entities.SalesDataItem.list('-date', 1000),
        initialData: []
    });

    // Filter data by time range
    const filteredReports = useMemo(() => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
        return reports.filter(r => new Date(r.report_date) >= cutoffDate);
    }, [reports, timeRange]);

    const filteredSalesData = useMemo(() => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
        return salesData.filter(d => new Date(d.date) >= cutoffDate);
    }, [salesData, timeRange]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalRevenue = filteredReports.reduce((sum, r) => sum + (r.total_revenue || 0), 0);
        const totalTransactions = filteredReports.reduce((sum, r) => sum + (r.total_transactions || 0), 0);
        const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        return {
            totalRevenue,
            totalTransactions,
            avgTransaction,
            reportCount: filteredReports.length
        };
    }, [filteredReports]);

    // Top sellers
    const topSellers = useMemo(() => {
        const itemSales = {};
        filteredSalesData.forEach(item => {
            if (item.item_name) {
                if (!itemSales[item.item_name]) {
                    itemSales[item.item_name] = { quantity: 0, revenue: 0 };
                }
                itemSales[item.item_name].quantity += item.quantity_sold || 0;
                itemSales[item.item_name].revenue += item.revenue || 0;
            }
        });

        return Object.entries(itemSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [filteredSalesData]);

    // Revenue trend
    const revenueTrend = useMemo(() => {
        const dailyRevenue = {};
        filteredReports.forEach(report => {
            const date = new Date(report.report_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            dailyRevenue[date] = (dailyRevenue[date] || 0) + (report.total_revenue || 0);
        });

        return Object.entries(dailyRevenue)
            .map(([date, revenue]) => ({ date, revenue }))
            .slice(-14); // Last 14 days
    }, [filteredReports]);

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        const categoryData = {};
        filteredSalesData.forEach(item => {
            if (item.category) {
                categoryData[item.category] = (categoryData[item.category] || 0) + (item.revenue || 0);
            }
        });

        return Object.entries(categoryData)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredSalesData]);

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Verkaufs-Analyse</h2>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                    <option value="7">Letzte 7 Tage</option>
                    <option value="30">Letzte 30 Tage</option>
                    <option value="90">Letzte 90 Tage</option>
                    <option value="365">Letztes Jahr</option>
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-800/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-amber-400">Gesamtumsatz</CardTitle>
                        <DollarSign className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{kpis.totalRevenue.toFixed(2)} €</div>
                        <p className="text-xs text-slate-400 mt-1">{kpis.reportCount} Berichte</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-800/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-400">Transaktionen</CardTitle>
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{kpis.totalTransactions}</div>
                        <p className="text-xs text-slate-400 mt-1">Verkäufe</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-800/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-400">Ø Bonwert</CardTitle>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{kpis.avgTransaction.toFixed(2)} €</div>
                        <p className="text-xs text-slate-400 mt-1">pro Transaktion</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-800/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-purple-400">Top Artikel</CardTitle>
                        <Award className="w-4 h-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{topSellers.length}</div>
                        <p className="text-xs text-slate-400 mt-1">verschiedene Produkte</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="trend" className="space-y-4">
                <TabsList className="bg-slate-800 border border-slate-700">
                    <TabsTrigger value="trend" className="data-[state=active]:bg-amber-600">Umsatztrend</TabsTrigger>
                    <TabsTrigger value="topsellers" className="data-[state=active]:bg-amber-600">Top-Seller</TabsTrigger>
                    <TabsTrigger value="categories" className="data-[state=active]:bg-amber-600">Kategorien</TabsTrigger>
                </TabsList>

                <TabsContent value="trend">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">Umsatzentwicklung</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="topsellers">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">Top 10 Verkaufsschlager</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={topSellers} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" stroke="#9ca3af" />
                                    <YAxis dataKey="name" type="category" width={150} stroke="#9ca3af" />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="revenue" fill="#f59e0b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="categories">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">Umsatz nach Kategorie</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={categoryBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}€`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {categoryBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}