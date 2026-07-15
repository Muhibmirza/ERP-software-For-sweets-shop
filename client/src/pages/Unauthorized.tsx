import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_HOME, ROLE_LABELS } from '../config/permissions';
import { useAuthStore } from '../store/auth';

export default function Unauthorized() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  return (
    <main className="grid min-h-[calc(100vh-8rem)] place-items-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-[#ead8bb] bg-[#fffaf0]/95 p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600">
          <ShieldX size={34} />
        </div>
        <p className="erp-eyebrow">Access Denied</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-[#0f615d]">You do not have permission to view this page</h1>
        <p className="mt-3 text-sm text-[#55716d]">
          Current role: <b>{role ? ROLE_LABELS[role] : 'Not signed in'}</b>
        </p>
        <Link className="btn-primary mt-6 w-full" to={role ? ROLE_HOME[role] : '/login'}>
          Go back to Dashboard
        </Link>
      </section>
    </main>
  );
}
