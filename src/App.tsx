import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from '@/context/DataContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import SalesAnalysis from '@/pages/SalesAnalysis';
import CustomerAnalysis from '@/pages/CustomerAnalysis';
import Reports from '@/pages/Reports';
import CigaretteOrder from '@/pages/CigaretteOrder';

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<SalesAnalysis />} />
            <Route path="/customers" element={<CustomerAnalysis />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/cigarette" element={<CigaretteOrder />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DataProvider>
  );
}
