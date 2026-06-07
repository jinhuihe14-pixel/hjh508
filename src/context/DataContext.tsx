import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Order, Product, CigaretteOrderRecord } from '@/types';
import { products as initialProducts } from '@/data/products';
import { generateOrders, generatePurchaseOrders } from '@/data/generator';

interface DataContextType {
  products: Product[];
  saleOrders: Order[];
  purchaseOrders: Order[];
  allOrders: Order[];
  cigaretteOrders: CigaretteOrderRecord[];
  addOrder: (order: Order) => void;
  addCigaretteOrder: (order: CigaretteOrderRecord) => void;
  confirmCigaretteOrderReceived: (orderId: string, receiveDate: string, items: { productId: string; receivedQuantity: number }[]) => void;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [products] = useState<Product[]>(initialProducts);
  const [saleOrders, setSaleOrders] = useState<Order[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Order[]>([]);
  const [cigaretteOrders, setCigaretteOrders] = useState<CigaretteOrderRecord[]>([]);

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

  const addCigaretteOrder = (order: CigaretteOrderRecord) => {
    setCigaretteOrders(prev => [order, ...prev].sort((a, b) => b.orderDate.localeCompare(a.orderDate)));
  };

  const confirmCigaretteOrderReceived = (
    orderId: string,
    receiveDate: string,
    receivedItems: { productId: string; receivedQuantity: number }[]
  ) => {
    setCigaretteOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;

      const updatedItems = order.items.map(item => {
        const received = receivedItems.find(ri => ri.productId === item.productId);
        return {
          ...item,
          receivedQuantity: received ? received.receivedQuantity : 0,
        };
      });

      const totalReceived = updatedItems.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
      const arrivalRate = order.totalOrderQuantity > 0
        ? Math.round((totalReceived / order.totalOrderQuantity) * 10000) / 100
        : 0;

      return {
        ...order,
        status: 'received' as const,
        receiveDate,
        items: updatedItems,
        totalReceivedQuantity: totalReceived,
        arrivalRate,
      };
    }));

    const inOrder: Order = {
      id: `pur-${Date.now()}`,
      orderNo: `RK${receiveDate.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: receiveDate,
      type: 'in',
      items: receivedItems
        .filter(ri => ri.receivedQuantity > 0)
        .map(ri => {
          const product = products.find(p => p.id === ri.productId);
          return {
            productId: ri.productId,
            productName: product?.name || '',
            quantity: ri.receivedQuantity,
            unitPrice: product?.costPrice || 0,
            amount: ri.receivedQuantity * (product?.costPrice || 0),
          };
        }),
      totalAmount: receivedItems.reduce((sum, ri) => {
        const product = products.find(p => p.id === ri.productId);
        return sum + ri.receivedQuantity * (product?.costPrice || 0);
      }, 0),
      remark: '香烟订货入库',
    };
    addOrder(inOrder);
  };

  const refreshData = () => {
    const sales = generateOrders([2024, 2025, 2026]);
    const purchases = generatePurchaseOrders([2024, 2025, 2026]);
    setSaleOrders(sales);
    setPurchaseOrders(purchases);
    setCigaretteOrders([]);
  };

  return (
    <DataContext.Provider value={{
      products,
      saleOrders,
      purchaseOrders,
      allOrders,
      cigaretteOrders,
      addOrder,
      addCigaretteOrder,
      confirmCigaretteOrderReceived,
      refreshData,
    }}>
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
