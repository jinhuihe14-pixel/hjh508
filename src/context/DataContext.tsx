import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Order, Product } from '@/types';
import { products as initialProducts } from '@/data/products';
import { generateOrders, generatePurchaseOrders } from '@/data/generator';

interface DataContextType {
  products: Product[];
  saleOrders: Order[];
  purchaseOrders: Order[];
  allOrders: Order[];
  addOrder: (order: Order) => void;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [products] = useState<Product[]>(initialProducts);
  const [saleOrders, setSaleOrders] = useState<Order[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Order[]>([]);

  useEffect(() => {
    const sales = generateOrders([2024, 2025, 2026]);
    const purchases = generatePurchaseOrders([2024, 2025, 2026]);
    setSaleOrders(sales);
    setPurchaseOrders(purchases);
  }, []);

  const allOrders = [...saleOrders, ...purchaseOrders].sort((a, b) => a.date.localeCompare(b.date));

  const addOrder = (order: Order) => {
    if (order.type === 'in') {
      setPurchaseOrders(prev => [...prev, order].sort((a, b) => a.date.localeCompare(b.date)));
    } else {
      setSaleOrders(prev => [...prev, order].sort((a, b) => a.date.localeCompare(b.date)));
    }
  };

  const refreshData = () => {
    const sales = generateOrders([2024, 2025, 2026]);
    const purchases = generatePurchaseOrders([2024, 2025, 2026]);
    setSaleOrders(sales);
    setPurchaseOrders(purchases);
  };

  return (
    <DataContext.Provider value={{ products, saleOrders, purchaseOrders, allOrders, addOrder, refreshData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
