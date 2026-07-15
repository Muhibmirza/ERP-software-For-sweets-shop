import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Plus, Printer, Trash2 } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { api, unwrap } from '../api/client';
import { OrderSlip } from '../components/print/OrderSlip';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import type { Customer, Order, OrderStatus, Product } from '../types';
import { date, pkr } from '../utils/format';
import { canEditDelete } from '../utils/permissions';
import { silentPrint } from '../utils/print';

const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED'];
type OrderFormItem = { productId: string; quantity: number; unitPrice: number };

export default function Orders() {
  const queryClient = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState<'ADVANCE' | 'DELIVERY' | 'WALKIN'>('ADVANCE');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderFormItem[]>([]);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const orders = useQuery({ queryKey: ['orders'], queryFn: () => unwrap<Order[]>(api.get('/api/orders')) });
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => unwrap<Customer[]>(api.get('/api/customers')) });
  const products = useQuery({ queryKey: ['products'], queryFn: () => unwrap<Product[]>(api.get('/api/products?limit=200&isActive=true')) });

  const selectedItems = useMemo(() => {
    return items.map((item) => {
      const product = products.data?.find((row) => row.id === item.productId);
      return {
        ...item,
        product,
        subtotal: item.unitPrice * item.quantity
      };
    });
  }, [items, products.data]);

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => unwrap<Order>(api.patch(`/api/orders/${id}/status`, { status })),
    onSuccess: () => {
      toast('Order updated');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const resetForm = () => {
    setOpen(false);
    setEditingOrder(null);
    setCustomerId('');
    setType('ADVANCE');
    setProductId('');
    setQuantity(1);
    setAdvancePaid(0);
    setDeliveryDate(new Date().toISOString().slice(0, 16));
    setNotes('');
    setItems([]);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
          customerId,
          type,
          items,
          advancePaid,
          deliveryDate,
          notes
        };
      return unwrap<Order>(editingOrder ? api.put(`/api/orders/${editingOrder.id}`, payload) : api.post('/api/orders', payload));
    },
    onSuccess: (order) => {
      toast(editingOrder ? 'Order updated' : 'Order created');
      if (!editingOrder) setCreatedOrder(order);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not save order', 'error')
  });

  const cancel = useMutation({
    mutationFn: (id: string) => unwrap<Order>(api.patch(`/api/orders/${id}/status`, { status: 'CANCELLED' })),
    onSuccess: () => {
      toast('Order cancelled');
      setDeleteOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not cancel order', 'error')
  });

  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/api/orders/${id}`)),
    onSuccess: () => {
      toast('Order deleted');
      setDeleteOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => toast(error.response?.data?.message || 'Could not delete order', 'error')
  });

  const addItem = () => {
    if (!productId || quantity <= 0) {
      toast('Select a product and quantity', 'error');
      return;
    }
    const product = products.data?.find((row) => row.id === productId);
    if (!product) return;
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        return current.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [...current, { productId, quantity, unitPrice: product.sellingPrice }];
    });
    setProductId('');
    setQuantity(1);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setCustomerId(order.customer?.id || '');
    setType(order.type);
    setAdvancePaid(order.advancePaid || 0);
    setDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setNotes(order.notes || '');
    setItems((order.items || []).map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })));
    setOpen(true);
  };

  const submitOrder = () => {
    if (!customerId) {
      toast('Select a customer first', 'error');
      return;
    }
    if (items.length === 0) {
      toast('Add at least one item', 'error');
      return;
    }
    if ((type === 'ADVANCE' || type === 'DELIVERY') && !deliveryDate) {
      toast('Delivery date is required for advance or delivery orders', 'error');
      return;
    }
    save.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Advance Orders</h2>
        <button className="touch inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 text-white" onClick={openCreate}>
          <Plus size={18} /> New Order
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {statuses.map((status) => (
          <section key={status} className={`rounded-lg border bg-white p-3 dark:border-slate-800 dark:bg-slate-900 ${status === 'CANCELLED' ? 'border-red-200 bg-red-50/40' : ''}`}>
            <h3 className={`mb-3 font-semibold ${status === 'CANCELLED' ? 'text-red-700' : ''}`}>{status} <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{orders.data?.filter((order) => order.status === status).length || 0}</span></h3>
            <div className="space-y-3">
              {orders.data?.filter((order) => order.status === status).map((order) => (
                <div key={order.id} className={`rounded-md border p-3 dark:border-slate-800 ${order.status === 'CANCELLED' ? 'border-red-200 bg-white/70 opacity-80' : ''}`}>
                  <div className="font-medium">{order.customer?.name || 'Customer'}</div>
                  {order.status === 'CANCELLED' && <div className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">CANCELLED</div>}
                  <div className="text-sm text-slate-500">Delivery {date(order.deliveryDate)}</div>
                  <div className="mt-2 flex items-center justify-between text-sm"><span>{pkr(order.totalAmount)}</span><span>Due {pkr(order.dueAmount)}</span></div>
                  <select className="touch mt-3 w-full rounded-md border bg-transparent px-2 dark:border-slate-700" value={order.status} onChange={(e) => update.mutate({ id: order.id, status: e.target.value as OrderStatus })}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="mt-3 flex justify-end gap-2">
                    {order.status === 'PENDING' && canEditDelete(user?.role) && (
                      <button className="grid h-8 w-8 place-items-center rounded-md border border-blue-200 text-blue-700" title="Edit" onClick={() => openEdit(order)}><Edit size={15} /></button>
                    )}
                    {canEditDelete(user?.role) && (
                      <button className="grid h-8 w-8 place-items-center rounded-md border border-red-200 text-red-700" title="Cancel or delete" onClick={() => setDeleteOrder(order)}><Trash2 size={15} /></button>
                    )}
                    <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-700" title="Print order slip" onClick={() => silentPrint(renderToStaticMarkup(<OrderSlip order={order} />))}><Printer size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal isOpen={open} onClose={resetForm} title={editingOrder ? 'Edit Order' : 'New Advance Order'} size="lg">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Customer <span className="text-red-600">*</span></span>
                <select className="touch w-full rounded-md border bg-transparent px-3" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                  <option value="">Select customer</option>
                  {customers.data?.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Order Type <span className="text-red-600">*</span></span>
                <select className="touch w-full rounded-md border bg-transparent px-3" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                  <option value="ADVANCE">Advance</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="WALKIN">Walk-in</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Delivery Date {(type === 'ADVANCE' || type === 'DELIVERY') && <span className="text-red-600">*</span>}</span>
                <input className="touch w-full rounded-md border bg-transparent px-3" type="datetime-local" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Advance Paid</span>
                <input className="touch w-full rounded-md border bg-transparent px-3" type="number" min="0" value={advancePaid} onChange={(event) => setAdvancePaid(Number(event.target.value))} />
              </label>
            </div>

            <div className="mt-4 rounded-md border p-3">
              <h4 className="mb-3 text-sm font-semibold">Items</h4>
              <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                <select className="touch rounded-md border bg-transparent px-3" value={productId} onChange={(event) => setProductId(event.target.value)}>
                  <option value="">Select product</option>
                  {products.data?.map((product) => (
                    <option key={product.id} value={product.id}>{product.name} - {pkr(product.sellingPrice)}</option>
                  ))}
                </select>
                <input className="touch rounded-md border bg-transparent px-3" type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
                <button className="touch rounded-md border px-4 font-medium" type="button" onClick={addItem}>+ Add Item</button>
              </div>

              <div className="mt-3 space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.productId} className="grid gap-2 rounded-md bg-[#f1e3cb] p-3 text-sm sm:grid-cols-[1fr_90px_110px_100px_auto] sm:items-center">
                    <span>{item.product?.name || 'Product'} x {item.quantity}</span>
                    <input className="touch rounded-md border bg-white/80 px-2" type="number" min="0" step="0.001" value={item.quantity} onChange={(event) => setItems((current) => current.map((row) => row.productId === item.productId ? { ...row, quantity: Number(event.target.value) } : row))} />
                    <input className="touch rounded-md border bg-white/80 px-2" type="number" min="1" value={item.unitPrice} onChange={(event) => setItems((current) => current.map((row) => row.productId === item.productId ? { ...row, unitPrice: Number(event.target.value) } : row))} />
                    <b>{pkr(item.subtotal)}</b>
                    <button className="text-red-600" onClick={() => setItems((current) => current.filter((row) => row.productId !== item.productId))}>Remove</button>
                  </div>
                ))}
                {items.length === 0 && <div className="rounded-md bg-[#f1e3cb] p-4 text-center text-sm text-slate-500">No items added</div>}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium">Notes</span>
              <textarea className="w-full rounded-md border bg-transparent p-3" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-slate-500">Total</div>
                <div className="text-2xl font-bold">{pkr(totalAmount)}</div>
                <div className="text-sm text-slate-500">Due {pkr(Math.max(totalAmount - advancePaid, 0))}</div>
              </div>
              <div className="flex gap-2">
                <button className="touch rounded-md border px-4" onClick={resetForm}>Cancel</button>
                <button className="touch rounded-md bg-orange-600 px-4 font-semibold text-white disabled:opacity-50" disabled={save.isPending} onClick={submitOrder}>
                  {save.isPending ? 'Saving...' : 'Save Order'}
                </button>
              </div>
            </div>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteOrder)}
        onClose={() => setDeleteOrder(null)}
        onConfirm={() => deleteOrder && (deleteOrder.status === 'CANCELLED' ? remove.mutate(deleteOrder.id) : cancel.mutate(deleteOrder.id))}
        title={`${deleteOrder?.status === 'CANCELLED' ? 'Delete' : 'Cancel'} ${deleteOrder?.customer?.name || 'Order'}?`}
        message={deleteOrder?.status === 'CANCELLED' ? 'This action cannot be undone.' : 'This will mark the order as cancelled.'}
        confirmLabel={deleteOrder?.status === 'CANCELLED' ? 'Delete' : 'Cancel Order'}
        isLoading={cancel.isPending || remove.isPending}
      />
      <Modal isOpen={Boolean(createdOrder)} onClose={() => setCreatedOrder(null)} title="Order Created" size="sm">
        {createdOrder && (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="text-lg font-bold">Order created</div>
              <div>Customer: <b>{createdOrder.customer?.name}</b></div>
              <div>Total: <b>{pkr(createdOrder.totalAmount)}</b> | Advance: <b>{pkr(createdOrder.advancePaid || 0)}</b></div>
              <div>Delivery: <b>{date(createdOrder.deliveryDate)}</b></div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setCreatedOrder(null)}>Close</button>
              <button className="btn-primary" onClick={() => { silentPrint(renderToStaticMarkup(<OrderSlip order={createdOrder} />)); setCreatedOrder(null); }}><Printer size={16} /> Print Order Slip</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
