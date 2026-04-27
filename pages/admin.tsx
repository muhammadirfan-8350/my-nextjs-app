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
                <input name="productId" placeholder="Product ID" className="w-full rounded-3xl border