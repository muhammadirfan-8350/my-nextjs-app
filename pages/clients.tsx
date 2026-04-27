import { GetServerSideProps } from 'next';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { getCookieToken, verifyToken } from '../lib/auth';

type ClientPageProps = {
  userName: string;
  clients: Array<{ id: string; name: string; industry: string; status: string; campaigns: number }>;
};

export default function ClientsPage({ userName, clients }: ClientPageProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar searchValue="" onSearchChange={() => {}} onExport={() => {}} userName={userName} />
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h1 className="text-3xl font-semibold text-slate-900">Clients</h1>
            <p className="mt-2 text-slate-500">Digital media and performance client details with campaign counts.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Client</th>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Industry</th>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Status</th>
                    <th className="border-b border-slate-200 px-4 py-4 font-medium text-slate-500">Active Campaigns</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No clients found</td>
                    </tr>
                  ) : clients.map((client) => (
                    <tr key={client.id} className="odd:bg-slate-50 hover:bg-slate-100">
                      <td className="border-b border-slate-200 px-4 py-4 font-medium text-slate-900">{client.name}</td>
                      <td className="border-b border-slate-200 px-4 py-4">{client.industry}</td>
                      <td className="border-b border-slate-200 px-4 py-4">{client.status}</td>
                      <td className="border-b border-slate-200 px-4 py-4">{client.campaigns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const token = getCookieToken(req as any);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return { redirect: { destination: '/', permanent: false } };
  }

  return {
    props: {
      userName: payload.name ?? '',
      clients: [],
    },
  };
};