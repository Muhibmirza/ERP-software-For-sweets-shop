import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Boxes, ClipboardList, PackagePlus, ShoppingCart, TrendingUp } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { TableSkeleton } from '../components/Skeleton';
import { ROLE_LABELS } from '../config/permissions';
import { useAuthStore } from '../store/auth';
import { pkr } from '../utils/format';
import type { Order } from '../types';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role || 'CASHIER';
  const liveQueryOptions = { refetchInterval: 5000, refetchOnMount: 'always' as const, refetchOnWindowFocus: true };
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => unwrap<any>(api.get('/api/dashboard/stats')), ...liveQueryOptions });
  const chart = useQuery({ queryKey: ['revenue', 7], queryFn: () => unwrap<any[]>(api.get('/api/dashboard/revenue-chart?days=7')), ...liveQueryOptions });
  const top = useQuery({ queryKey: ['top-products'], queryFn: () => unwrap<any[]>(api.get('/api/dashboard/top-products?limit=5')), ...liveQueryOptions });
  const orders = useQuery({ queryKey: ['recent-orders'], queryFn: () => unwrap<Order[]>(api.get('/api/dashboard/recent-orders')), ...liveQueryOptions });

  const adminCards = [
    ['Today Sales', pkr(stats.data?.todayRevenue), TrendingUp],
    ['Sales Count', stats.data?.todaySalesCount ?? 0, ShoppingCart],
    ['Products', stats.data?.totalProducts ?? 0, Boxes],
    ['Raw Materials', stats.data?.rawMaterialCount ?? 0, PackagePlus],
    ['Orders Open', stats.data?.pendingOrders ?? 0, ClipboardList],
    ['Low Stock', stats.data?.lowStockCount ?? 0, PackagePlus],
    ['Customers', stats.data?.totalCustomers ?? 0, ShoppingCart]
  ];
  const productionCards = [
    ['Production Orders', stats.data?.pendingProductionOrders ?? 0, PackagePlus],
    ['Low Stock', stats.data?.lowStockCount ?? 0, PackagePlus],
    ['Raw Materials', stats.data?.rawMaterialCount ?? 0, Boxes],
    ['Pending Orders', stats.data?.pendingOrders ?? 0, ClipboardList]
  ];
  const cashierCards = [
    ['Today Sales', pkr(stats.data?.todayRevenue), TrendingUp],
    ['Sales Count', stats.data?.todaySalesCount ?? 0, ShoppingCart],
    ['Pending Deliveries', stats.data?.pendingOrders ?? 0, ClipboardList],
    ['Low Stock Alerts', stats.data?.lowStockCount ?? 0, PackagePlus]
  ];
  const cards = role === 'ADMIN' ? adminCards : role === 'PRODUCTION_MANAGER' ? productionCards : cashierCards;

  return (
    <div className="space-y-5">
      <div className="erp-page-header">
        <div>
          <p className="erp-eyebrow">{ROLE_LABELS[role]}</p>
          <h2 className="erp-title">Dashboard</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label as string}</p>
              <Icon className="text-orange-600" />
            </div>
            <div className="mt-3 text-2xl font-bold">{String(value)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Revenue</h2>
            <div className="rounded-md bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">7 days</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart.data || []}>
                <defs>
                  <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => pkr(Number(value))} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#revenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Quick Actions</h2>
          <div className="grid gap-2">
            {role !== 'PRODUCTION_MANAGER' && <Link className="touch rounded-md bg-orange-600 px-4 py-3 text-center font-medium text-white" to="/pos">
              New Sale
            </Link>}
            <Link className="touch rounded-md border px-4 py-3 text-center font-medium dark:border-slate-700" to={role === 'PRODUCTION_MANAGER' ? '/production' : '/orders'}>
              {role === 'PRODUCTION_MANAGER' ? 'Production Orders' : 'New Order'}
            </Link>
            {role !== 'CASHIER' && <Link className="touch rounded-md border px-4 py-3 text-center font-medium dark:border-slate-700" to="/inventory">
              Inventory
            </Link>}
            {role === 'ADMIN' && <Link className="touch rounded-md border px-4 py-3 text-center font-medium dark:border-slate-700" to="/reports">
              Reports
            </Link>}
          </div>
        </section>
      </div>

      {role !== 'PRODUCTION_MANAGER' && <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Top Selling Items</h2>
          {top.isLoading ? <TableSkeleton rows={5} /> : top.data?.map((item) => (
            <div key={item.productId} className="flex min-h-12 items-center justify-between border-b text-sm last:border-0 dark:border-slate-800">
              <span>{item.product?.name}</span>
              <span className="font-medium">{pkr(item._sum?.subtotal || 0)}</span>
            </div>
          ))}
        </section>
        <section className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Recent Orders</h2>
          {orders.isLoading ? <TableSkeleton rows={5} /> : orders.data?.map((order) => (
            <div key={order.id} className="flex min-h-12 items-center justify-between border-b text-sm last:border-0 dark:border-slate-800">
              <span>{order.customer?.name || 'Walk-in'}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{order.status}</span>
            </div>
          ))}
        </section>
      </div>}
    </div>
  );
}
