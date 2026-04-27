import { FormEvent, useState } from 'react';
import { GetServerSideProps } from 'next';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import prisma from '../lib/prisma';
import { getCookieToken, verifyToken } from '../lib/auth';

type AdminPageProps = {
  userName: string;
  campaigns: Array<{ id: string; campaignName: string; platform: string; spend: number; conversions: number }>;
  products: Array<{ id: string; name: string; spend: number; conversions: number }>;
  clients: Array<{ id: string; name: string; industry: string; status: string }>;
};

export default function AdminPage({ userName, campaigns, products, clients }: AdminPageProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      setMessage('Campaign created successfully. Refresh to view the latest list.');
      form.reset();
    } else {
      setMessage('Unable to create campaign.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar searchValue="" onSearchChange={() => {}} onExport={() => {}} userName={userName} />
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h1 className="text-3xl font-semibold text-slate-900">Admin Panel</h1>
            <p className="mt-2 text-slate-500">Manage campaigns, products, and clients with direct CRUD operations.</p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-900">Quick campaign creation</h2>
              <p className="mt-2 text-slate-500">Create new campaigns and link them to existing products and clients.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input name="campaignName" placeholder="Campaign name" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" />
                <input name="platform" placeholder="Platform" required className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" />
                <input name="clientId" placeholder="Client ID" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" />
                <input name="productId" placeholder="Product ID" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="spend" placeholder="Spend" type="number" className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" />
                  <input name="conversions" placeholder="Conversions" type="number" className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" />
                </div>
                <button type="submit" className="rounded-3xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition">
                  Create campaign
                </button>
                {message && <p className="text-sm text-slate-600">{message}</p>}
              </form>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <p>Products: {products.length}</p>
                <p>Clients: {clients.length}</p>
                <p>Campaigns: {campaigns.length}</p>
                <p className="text-slate-500">Existing objects can be updated in admin API endpoints.</p>
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">Current campaigns</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Name</th>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Platform</th>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Spend</th>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="odd:bg-slate-50 hover:bg-slate-100">
                      <td className="border-b border-slate-200 px-4 py-4">{campaign.campaignName}</td>
                      <td className="border-b border-slate-200 px-4 py-4">{campaign.platform}</td>
                      <td className="border-b border-slate-200 px-4 py-4">PKR {campaign.spend.toLocaleString()}</td>
                      <td className="border-b border-slate-200 px-4 py-4">{campaign.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const token = getCookieToken(req as any);
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return { redirect: { destination: '/', permanent: false } };
  }

  let campaigns: any[] = [];
  try {
    campaigns = await prisma.campaignData.findMany({
      select: { id: true, campaignName: true, platform: true, spend: true, conversions: true },
      take: 20,
    });
  } catch (e) {
    console.error('DB error:', e);
  }

  return {
    props: {
      userName: payload.name ?? '',
      campaigns,
      products: [],
      clients: [],
    },
  };
};

const campaigns = await prisma.campaignData.findMany({
  select: { id: true, campaignName: true, platform: true, spend: true, conversions: true },
  take: 20,
});
const products: any[] = [];
const clients: any[] = [];

  return {
    props: {
      userName: payload.name,
      campaigns,
      products,
      clients,
    },
  };
};
