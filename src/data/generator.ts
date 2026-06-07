import dayjs from 'dayjs';
import type { Order, OrderItem, CustomerType } from '@/types';
import { products } from './products';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrderId(prefix: string, date: string, index: number): string {
  return `${prefix}${date.replace(/-/g, '')}${String(index).padStart(4, '0')}`;
}

export function generateOrders(years: number[] = [2024, 2025, 2026]): Order[] {
  const orders: Order[] = [];
  
  const festivals = [
    { month: 1, day: 1, name: '元旦', duration: 3 },
    { month: 2, day: 10, name: '春节', duration: 15 },
    { month: 4, day: 4, name: '清明', duration: 3 },
    { month: 5, day: 1, name: '劳动节', duration: 5 },
    { month: 6, day: 10, name: '端午', duration: 3 },
    { month: 9, day: 17, name: '中秋', duration: 3 },
    { month: 10, day: 1, name: '国庆', duration: 7 },
    { month: 12, day: 25, name: '圣诞', duration: 2 },
  ];

  const weddingMonths = [4, 5, 9, 10, 11];

  years.forEach(year => {
    const startDate = dayjs(`${year}-01-01`);
    const endDate = year === 2026 ? dayjs('2026-06-06') : dayjs(`${year}-12-31`);
    let currentDate = startDate;
    let orderIndex = 1;

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const month = currentDate.month() + 1;
      const dayOfWeek = currentDate.day();
      
      const isFestival = festivals.some(f => {
        const festivalDate = dayjs(`${year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`);
        const festivalStart = festivalDate.subtract(3, 'day');
        const festivalEnd = festivalDate.add(f.duration, 'day');
        return currentDate.isAfter(festivalStart) && currentDate.isBefore(festivalEnd);
      });

      const isWeddingSeason = weddingMonths.includes(month);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let baseRetailOrders = 8;
      if (isFestival) baseRetailOrders = 20;
      else if (isWeekend) baseRetailOrders = 12;
      
      const retailOrdersCount = randomInt(Math.floor(baseRetailOrders * 0.7), Math.floor(baseRetailOrders * 1.3));
      
      for (let i = 0; i < retailOrdersCount; i++) {
        const items = generateRetailOrderItems(isFestival, isWeekend);
        if (items.length > 0) {
          orders.push({
            id: generateOrderId('XS', dateStr, orderIndex),
            orderNo: generateOrderId('XS', dateStr, orderIndex),
            date: dateStr,
            type: 'out',
            customerType: 'retail',
            items,
            totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
          });
          orderIndex++;
        }
      }

      if (isWeddingSeason && (dayOfWeek === 0 || dayOfWeek === 6)) {
        const weddingOrdersCount = randomInt(0, 2);
        for (let i = 0; i < weddingOrdersCount; i++) {
          const items = generateWeddingOrderItems();
          if (items.length > 0) {
            orders.push({
              id: generateOrderId('XS', dateStr, orderIndex),
              orderNo: generateOrderId('XS', dateStr, orderIndex),
              date: dateStr,
              type: 'out',
              customerType: 'wedding',
              customerName: `婚宴客户${orderIndex}`,
              items,
              totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
              remark: '婚宴用酒',
            });
            orderIndex++;
          }
        }
      }

      const bulkOrdersCount = randomInt(0, 1);
      if (bulkOrdersCount > 0) {
        const items = generateBulkOrderItems();
        if (items.length > 0) {
          orders.push({
            id: generateOrderId('XS', dateStr, orderIndex),
            orderNo: generateOrderId('XS', dateStr, orderIndex),
            date: dateStr,
            type: 'out',
            customerType: 'bulk',
            customerName: `团购客户${orderIndex}`,
            items,
            totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
            remark: '团购订单',
          });
          orderIndex++;
        }
      }

      currentDate = currentDate.add(1, 'day');
    }
  });

  return orders.sort((a, b) => a.date.localeCompare(b.date));
}

function generateRetailOrderItems(isFestival: boolean, isWeekend: boolean): OrderItem[] {
  const items: OrderItem[] = [];
  const itemCount = randomInt(1, isFestival ? 5 : 3);
  
  const liquorProducts = products.filter(p => p.category === '白酒');
  const beerProducts = products.filter(p => p.category === '啤酒');
  const tobaccoProducts = products.filter(p => p.category === '香烟');
  const beverageProducts = products.filter(p => p.category === '饮料');

  for (let i = 0; i < itemCount; i++) {
    const categoryRoll = Math.random();
    let productPool;
    let qtyMin = 1, qtyMax = 2;

    if (categoryRoll < 0.35) {
      productPool = tobaccoProducts;
      qtyMin = 1;
      qtyMax = isFestival ? 5 : 2;
    } else if (categoryRoll < 0.55) {
      productPool = beerProducts;
      qtyMin = 1;
      qtyMax = isWeekend ? 5 : 2;
    } else if (categoryRoll < 0.8) {
      productPool = liquorProducts;
      if (isFestival) {
        productPool = liquorProducts.filter(p => p.isFestivalHot);
        qtyMin = 1;
        qtyMax = 3;
      }
    } else {
      productPool = beverageProducts;
      qtyMin = 1;
      qtyMax = 3;
    }

    const product = productPool[randomInt(0, productPool.length - 1)];
    const quantity = randomInt(qtyMin, qtyMax);
    
    const existingItem = items.find(item => item.productId === product.id);
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.amount = existingItem.quantity * existingItem.unitPrice;
    } else {
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.salePrice,
        amount: quantity * product.salePrice,
      });
    }
  }

  return items;
}

function generateWeddingOrderItems(): OrderItem[] {
  const items: OrderItem[] = [];
  
  const hotLiquors = products.filter(p => p.category === '白酒' && p.isFestivalHot);
  const liquors = products.filter(p => p.category === '白酒');
  const beers = products.filter(p => p.category === '啤酒');
  const beverages = products.filter(p => p.category === '饮料');
  const highEndTobacco = products.filter(p => p.category === '香烟' && p.salePrice >= 400);

  const liquor = Math.random() > 0.5 
    ? hotLiquors[randomInt(0, hotLiquors.length - 1)] 
    : liquors[randomInt(0, liquors.length - 1)];
  const liquorQty = randomInt(10, 30);
  items.push({
    productId: liquor.id,
    productName: liquor.name,
    quantity: liquorQty,
    unitPrice: liquor.salePrice * 0.9,
    amount: liquorQty * liquor.salePrice * 0.9,
  });

  const beer = beers[randomInt(0, beers.length - 1)];
  const beerQty = randomInt(5, 20);
  items.push({
    productId: beer.id,
    productName: beer.name,
    quantity: beerQty,
    unitPrice: beer.salePrice * 0.85,
    amount: beerQty * beer.salePrice * 0.85,
  });

  const beverage = beverages[randomInt(0, beverages.length - 1)];
  const beverageQty = randomInt(3, 10);
  items.push({
    productId: beverage.id,
    productName: beverage.name,
    quantity: beverageQty,
    unitPrice: beverage.salePrice * 0.85,
    amount: beverageQty * beverage.salePrice * 0.85,
  });

  if (Math.random() > 0.5) {
    const tobacco = highEndTobacco[randomInt(0, highEndTobacco.length - 1)];
    const tobaccoQty = randomInt(5, 15);
    items.push({
      productId: tobacco.id,
      productName: tobacco.name,
      quantity: tobaccoQty,
      unitPrice: tobacco.salePrice * 0.95,
      amount: tobaccoQty * tobacco.salePrice * 0.95,
    });
  }

  return items;
}

function generateBulkOrderItems(): OrderItem[] {
  const items: OrderItem[] = [];
  const itemCount = randomInt(2, 5);

  for (let i = 0; i < itemCount; i++) {
    const product = products[randomInt(0, products.length - 1)];
    const quantity = randomInt(5, 50);
    
    const existingItem = items.find(item => item.productId === product.id);
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.amount = existingItem.quantity * existingItem.unitPrice;
    } else {
      const discount = 0.8 + Math.random() * 0.1;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.salePrice * discount,
        amount: quantity * product.salePrice * discount,
      });
    }
  }

  return items;
}

export function generatePurchaseOrders(years: number[] = [2024, 2025, 2026]): Order[] {
  const orders: Order[] = [];
  
  years.forEach(year => {
    const startDate = dayjs(`${year}-01-01`);
    const endDate = year === 2026 ? dayjs('2026-06-06') : dayjs(`${year}-12-31`);
    let currentDate = startDate;
    let orderIndex = 1;

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const dayOfWeek = currentDate.day();
      
      if (dayOfWeek === 1) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const items: OrderItem[] = [];
        
        products.forEach(product => {
          let restockQty = 0;
          
          if (product.category === '香烟') {
            restockQty = Math.floor(product.maxStock * 0.3);
          } else if (product.isFestivalHot) {
            restockQty = Math.floor(product.maxStock * 0.4);
          } else {
            restockQty = Math.floor(product.maxStock * 0.2);
          }
          
          if (restockQty > 0) {
            items.push({
              productId: product.id,
              productName: product.name,
              quantity: restockQty,
              unitPrice: product.costPrice,
              amount: restockQty * product.costPrice,
            });
          }
        });

        if (items.length > 0) {
          orders.push({
            id: generateOrderId('RK', dateStr, orderIndex),
            orderNo: generateOrderId('RK', dateStr, orderIndex),
            date: dateStr,
            type: 'in',
            items,
            totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
            remark: '常规补货',
          });
          orderIndex++;
        }
      }
      
      currentDate = currentDate.add(1, 'day');
    }
  });

  return orders.sort((a, b) => a.date.localeCompare(b.date));
}
