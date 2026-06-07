import dayjs from 'dayjs';
import type { Product, Order, StockInfo, SaleAnalysis, FestivalSaleAnalysis, Category, CustomerType } from '@/types';
import { products } from '@/data/products';
import { festivals } from '@/data/customers';

export function calculateCurrentStock(saleOrders: Order[], purchaseOrders: Order[], asOfDate?: string): Map<string, number> {
  const stockMap = new Map<string, number>();
  const targetDate = asOfDate ? dayjs(asOfDate) : dayjs();

  products.forEach(p => stockMap.set(p.id, p.minStock * 2));

  purchaseOrders.forEach(order => {
    if (dayjs(order.date).isBefore(targetDate) || dayjs(order.date).isSame(targetDate, 'day')) {
      order.items.forEach(item => {
        const current = stockMap.get(item.productId) || 0;
        stockMap.set(item.productId, current + item.quantity);
      });
    }
  });

  saleOrders.forEach(order => {
    if (order.type === 'out' && (dayjs(order.date).isBefore(targetDate) || dayjs(order.date).isSame(targetDate, 'day'))) {
      order.items.forEach(item => {
        const current = stockMap.get(item.productId) || 0;
        stockMap.set(item.productId, Math.max(0, current - item.quantity));
      });
    }
  });

  return stockMap;
}

export function getStockInfoList(saleOrders: Order[], purchaseOrders: Order[], asOfDate?: string): StockInfo[] {
  const stockMap = calculateCurrentStock(saleOrders, purchaseOrders, asOfDate);
  const targetDate = asOfDate ? dayjs(asOfDate) : dayjs();
  const thirtyDaysAgo = targetDate.subtract(30, 'day');

  const productMap = new Map(products.map(p => [p.id, p]));

  const dailySalesMap = new Map<string, number>();
  saleOrders.forEach(order => {
    if (order.type === 'out' && dayjs(order.date).isAfter(thirtyDaysAgo) && dayjs(order.date).isBefore(targetDate)) {
      order.items.forEach(item => {
        const current = dailySalesMap.get(item.productId) || 0;
        dailySalesMap.set(item.productId, current + item.quantity);
      });
    }
  });

  const lastInMap = new Map<string, string>();
  purchaseOrders.forEach(order => {
    if (dayjs(order.date).isBefore(targetDate) || dayjs(order.date).isSame(targetDate, 'day')) {
      order.items.forEach(item => {
        const lastDate = lastInMap.get(item.productId);
        if (!lastDate || dayjs(order.date).isAfter(dayjs(lastDate))) {
          lastInMap.set(item.productId, order.date);
        }
      });
    }
  });

  const lastOutMap = new Map<string, string>();
  saleOrders.forEach(order => {
    if (order.type === 'out' && (dayjs(order.date).isBefore(targetDate) || dayjs(order.date).isSame(targetDate, 'day'))) {
      order.items.forEach(item => {
        const lastDate = lastOutMap.get(item.productId);
        if (!lastDate || dayjs(order.date).isAfter(dayjs(lastDate))) {
          lastOutMap.set(item.productId, order.date);
        }
      });
    }
  });

  return products.map(product => {
    const currentStock = stockMap.get(product.id) || 0;
    const thirtyDaySales = dailySalesMap.get(product.id) || 0;
    const avgDailySale = thirtyDaySales / 30;
    const daysOfStock = avgDailySale > 0 ? Math.round(currentStock / avgDailySale) : 999;

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      currentStock,
      avgDailySale: Math.round(avgDailySale * 100) / 100,
      daysOfStock,
      lastInDate: lastInMap.get(product.id) || '-',
      lastOutDate: lastOutMap.get(product.id) || '-',
    };
  });
}

export function getSaleAnalysis(saleOrders: Order[], period: 'month' | 'quarter' | 'year', dateStr?: string): SaleAnalysis[] {
  const targetDate = dateStr ? dayjs(dateStr) : dayjs();
  let startDate: dayjs.Dayjs;
  let endDate: dayjs.Dayjs;
  let periodLabel: string;

  if (period === 'month') {
    startDate = targetDate.startOf('month');
    endDate = targetDate.endOf('month');
    periodLabel = targetDate.format('YYYY-MM');
  } else if (period === 'quarter') {
    const quarter = Math.floor(targetDate.month() / 3);
    startDate = dayjs(`${targetDate.year()}-${quarter * 3 + 1}-01`);
    endDate = startDate.add(3, 'month').subtract(1, 'day').endOf('day');
    periodLabel = `${targetDate.year()}Q${quarter + 1}`;
  } else {
    startDate = targetDate.startOf('year');
    endDate = targetDate.endOf('year');
    periodLabel = targetDate.year().toString();
  }

  const productMap = new Map(products.map(p => [p.id, p]));
  const saleMap = new Map<string, { quantity: number; amount: number; cost: number }>();

  saleOrders.forEach(order => {
    if (order.type === 'out') {
      const orderDate = dayjs(order.date);
      if ((orderDate.isAfter(startDate) || orderDate.isSame(startDate, 'day')) && 
          (orderDate.isBefore(endDate) || orderDate.isSame(endDate, 'day'))) {
        order.items.forEach(item => {
          const product = productMap.get(item.productId);
          if (!product) return;
          
          const existing = saleMap.get(item.productId) || { quantity: 0, amount: 0, cost: 0 };
          saleMap.set(item.productId, {
            quantity: existing.quantity + item.quantity,
            amount: existing.amount + item.amount,
            cost: existing.cost + item.quantity * product.costPrice,
          });
        });
      }
    }
  });

  const ninetyDaysAgo = endDate.subtract(90, 'day');
  const lastSaleMap = new Map<string, string>();
  
  saleOrders.forEach(order => {
    if (order.type === 'out' && dayjs(order.date).isBefore(endDate)) {
      order.items.forEach(item => {
        const lastDate = lastSaleMap.get(item.productId);
        if (!lastDate || dayjs(order.date).isAfter(dayjs(lastDate))) {
          lastSaleMap.set(item.productId, order.date);
        }
      });
    }
  });

  const stockMap = calculateCurrentStock(saleOrders, [], endDate.format('YYYY-MM-DD'));

  return products.map(product => {
    const saleData = saleMap.get(product.id) || { quantity: 0, amount: 0, cost: 0 };
    const profit = saleData.amount - saleData.cost;
    const profitRate = saleData.amount > 0 ? (profit / saleData.amount) * 100 : 0;
    
    const avgStock = stockMap.get(product.id) || 0;
    const turnoverRate = avgStock > 0 ? saleData.quantity / avgStock : 0;

    const lastSaleDate = lastSaleMap.get(product.id);
    const slowMovingDays = lastSaleDate 
      ? Math.max(0, endDate.diff(dayjs(lastSaleDate), 'day'))
      : 999;
    const isSlowMoving = slowMovingDays >= 90;

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      brand: product.brand,
      period: periodLabel,
      saleQuantity: saleData.quantity,
      saleAmount: Math.round(saleData.amount * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitRate: Math.round(profitRate * 100) / 100,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
      isSlowMoving,
      slowMovingDays,
    };
  });
}

export function getFestivalSaleAnalysis(saleOrders: Order[], festivalId: string): FestivalSaleAnalysis | null {
  const festival = festivals.find(f => f.id === festivalId);
  if (!festival) return null;

  const startDate = dayjs(festival.startDate);
  const endDate = dayjs(festival.endDate);

  const productSales = new Map<string, { productName: string; category: Category; quantity: number; amount: number }>();
  const categoryStats = new Map<Category, { amount: number; quantity: number }>();
  let totalAmount = 0;
  let totalQuantity = 0;

  const productMap = new Map(products.map(p => [p.id, p]));

  saleOrders.forEach(order => {
    if (order.type === 'out') {
      const orderDate = dayjs(order.date);
      if ((orderDate.isAfter(startDate) || orderDate.isSame(startDate, 'day')) && 
          (orderDate.isBefore(endDate) || orderDate.isSame(endDate, 'day'))) {
        order.items.forEach(item => {
          const product = productMap.get(item.productId);
          if (!product) return;

          const existing = productSales.get(item.productId) || {
            productName: item.productName,
            category: product.category,
            quantity: 0,
            amount: 0,
          };
          productSales.set(item.productId, {
            ...existing,
            quantity: existing.quantity + item.quantity,
            amount: existing.amount + item.amount,
          });

          const catStat = categoryStats.get(product.category) || { amount: 0, quantity: 0 };
          categoryStats.set(product.category, {
            amount: catStat.amount + item.amount,
            quantity: catStat.quantity + item.quantity,
          });

          totalAmount += item.amount;
          totalQuantity += item.quantity;
        });
      }
    }
  });

  const topProducts = Array.from(productSales.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    festivalName: festival.name,
    festivalYear: festival.year,
    startDate: festival.startDate,
    endDate: festival.endDate,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalQuantity,
    topProducts,
    categoryStats: Array.from(categoryStats.entries()).map(([category, data]) => ({
      category,
      amount: Math.round(data.amount * 100) / 100,
      quantity: data.quantity,
    })),
  };
}

export function getCustomerTypeStats(saleOrders: Order[], startDate?: string, endDate?: string) {
  const start = startDate ? dayjs(startDate) : dayjs().subtract(30, 'day');
  const end = endDate ? dayjs(endDate) : dayjs();

  const stats = {
    retail: { orderCount: 0, totalAmount: 0, productCategories: new Map<Category, number>() },
    wedding: { orderCount: 0, totalAmount: 0, productCategories: new Map<Category, number>() },
    bulk: { orderCount: 0, totalAmount: 0, productCategories: new Map<Category, number>() },
  };

  const productMap = new Map(products.map(p => [p.id, p]));

  saleOrders.forEach(order => {
    if (order.type === 'out') {
      const orderDate = dayjs(order.date);
      if ((orderDate.isAfter(start) || orderDate.isSame(start, 'day')) && 
          (orderDate.isBefore(end) || orderDate.isSame(end, 'day'))) {
        const type = order.customerType || 'retail';
        const stat = stats[type];
        
        stat.orderCount++;
        stat.totalAmount += order.totalAmount;

        order.items.forEach(item => {
          const product = productMap.get(item.productId);
          if (product) {
            const catAmount = stat.productCategories.get(product.category) || 0;
            stat.productCategories.set(product.category, catAmount + item.amount);
          }
        });
      }
    }
  });

  return {
    retail: {
      orderCount: stats.retail.orderCount,
      totalAmount: Math.round(stats.retail.totalAmount * 100) / 100,
      avgOrderAmount: stats.retail.orderCount > 0 
        ? Math.round((stats.retail.totalAmount / stats.retail.orderCount) * 100) / 100 
        : 0,
      categoryBreakdown: Array.from(stats.retail.productCategories.entries()).map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      })),
    },
    wedding: {
      orderCount: stats.wedding.orderCount,
      totalAmount: Math.round(stats.wedding.totalAmount * 100) / 100,
      avgOrderAmount: stats.wedding.orderCount > 0 
        ? Math.round((stats.wedding.totalAmount / stats.wedding.orderCount) * 100) / 100 
        : 0,
      categoryBreakdown: Array.from(stats.wedding.productCategories.entries()).map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      })),
    },
    bulk: {
      orderCount: stats.bulk.orderCount,
      totalAmount: Math.round(stats.bulk.totalAmount * 100) / 100,
      avgOrderAmount: stats.bulk.orderCount > 0 
        ? Math.round((stats.bulk.totalAmount / stats.bulk.orderCount) * 100) / 100 
        : 0,
      categoryBreakdown: Array.from(stats.bulk.productCategories.entries()).map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      })),
    },
  };
}

export function getMonthlySales(saleOrders: Order[], year: number) {
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    amount: 0,
    profit: 0,
    orderCount: 0,
  }));

  const productMap = new Map(products.map(p => [p.id, p]));

  saleOrders.forEach(order => {
    if (order.type === 'out') {
      const orderDate = dayjs(order.date);
      if (orderDate.year() === year) {
        const monthIndex = orderDate.month();
        monthlyData[monthIndex].orderCount++;
        monthlyData[monthIndex].amount += order.totalAmount;
        
        order.items.forEach(item => {
          const product = productMap.get(item.productId);
          if (product) {
            monthlyData[monthIndex].profit += (item.unitPrice - product.costPrice) * item.quantity;
          }
        });
      }
    }
  });

  return monthlyData.map(d => ({
    ...d,
    amount: Math.round(d.amount * 100) / 100,
    profit: Math.round(d.profit * 100) / 100,
  }));
}

export function getCigaretteOrderDemand(saleOrders: Order[], purchaseOrders: Order[], cigaretteOrders?: { status: string; items: { productId: string; orderQuantity: number; receivedQuantity: number | null }[] }[]) {
  const today = dayjs();
  const lastMonday = today.day() === 1 ? today : today.day(today.day() === 0 ? -6 : 1 - today.day());
  const nextMonday = lastMonday.add(7, 'day');
  
  const stockMap = calculateCurrentStock(saleOrders, purchaseOrders);
  
  const cigarettes = products.filter(p => p.category === '香烟');
  
  const sevenDaySales = new Map<string, number>();
  const thirtyDaySales = new Map<string, number>();
  
  const sevenDaysAgo = today.subtract(7, 'day');
  const thirtyDaysAgo = today.subtract(30, 'day');
  
  saleOrders.forEach(order => {
    if (order.type === 'out' && dayjs(order.date).isAfter(thirtyDaysAgo)) {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product?.category === '香烟') {
          const thirtyQty = thirtyDaySales.get(item.productId) || 0;
          thirtyDaySales.set(item.productId, thirtyQty + item.quantity);
          
          if (dayjs(order.date).isAfter(sevenDaysAgo)) {
            const sevenQty = sevenDaySales.get(item.productId) || 0;
            sevenDaySales.set(item.productId, sevenQty + item.quantity);
          }
        }
      });
    }
  });

  const pendingOrderQty = new Map<string, number>();
  if (cigaretteOrders) {
    cigaretteOrders.forEach(order => {
      if (order.status === 'pending') {
        order.items.forEach(item => {
          const existing = pendingOrderQty.get(item.productId) || 0;
          pendingOrderQty.set(item.productId, existing + item.orderQuantity);
        });
      }
    });
  }

  return cigarettes.map(product => {
    const currentStock = stockMap.get(product.id) || 0;
    const avgDailySale = (thirtyDaySales.get(product.id) || 0) / 30;
    const weeklyDemand = Math.ceil(avgDailySale * 7);
    const pendingQty = pendingOrderQty.get(product.id) || 0;
    const suggestedOrder = Math.max(0, product.maxStock - currentStock - pendingQty - weeklyDemand + weeklyDemand * 2);
    const daysUntilOrder = nextMonday.diff(today, 'day');
    
    return {
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      currentStock,
      avgDailySale: Math.round(avgDailySale * 100) / 100,
      weeklyDemand,
      minStock: product.minStock,
      maxStock: product.maxStock,
      suggestedOrder: Math.max(0, Math.ceil(suggestedOrder / 5) * 5),
      pendingOrderQuantity: pendingQty,
      daysUntilNextOrder: daysUntilOrder,
      nextOrderDate: nextMonday.format('YYYY-MM-DD'),
      isUrgent: currentStock + pendingQty <= product.minStock,
    };
  });
}
