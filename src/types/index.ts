export type Category = '白酒' | '啤酒' | '香烟' | '饮料';

export type CustomerType = 'retail' | 'wedding' | 'bulk';

export type OrderType = 'in' | 'out';

export interface Product {
  id: string;
  name: string;
  category: Category;
  brand: string;
  spec: string;
  costPrice: number;
  salePrice: number;
  unit: string;
  isFestivalHot: boolean;
  minStock: number;
  maxStock: number;
  orderCycleDays?: number;
}

export interface StockRecord {
  id: string;
  productId: string;
  date: string;
  quantity: number;
  type: 'in' | 'out' | 'adjust';
  orderId?: string;
  remark?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  date: string;
  type: OrderType;
  customerType?: CustomerType;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  remark?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  phone: string;
  totalOrders: number;
  totalAmount: number;
  lastOrderDate: string;
}

export interface Festival {
  id: string;
  name: string;
  date: string;
  year: number;
  startDate: string;
  endDate: string;
}

export interface DailySale {
  date: string;
  productId: string;
  quantity: number;
  amount: number;
  profit: number;
  customerType: CustomerType;
}

export interface StockInfo {
  productId: string;
  productName: string;
  category: Category;
  currentStock: number;
  avgDailySale: number;
  daysOfStock: number;
  lastInDate: string;
  lastOutDate: string;
}

export interface SaleAnalysis {
  productId: string;
  productName: string;
  category: Category;
  brand: string;
  period: string;
  saleQuantity: number;
  saleAmount: number;
  profit: number;
  profitRate: number;
  turnoverRate: number;
  isSlowMoving: boolean;
  slowMovingDays: number;
}

export interface FestivalSaleAnalysis {
  festivalName: string;
  festivalYear: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalQuantity: number;
  topProducts: {
    productId: string;
    productName: string;
    category: Category;
    quantity: number;
    amount: number;
  }[];
  categoryStats: {
    category: Category;
    amount: number;
    quantity: number;
  }[];
}

export interface CigaretteOrderItem {
  productId: string;
  productName: string;
  brand: string;
  orderQuantity: number;
  receivedQuantity: number | null;
  unitPrice: number;
}

export interface CigaretteOrderRecord {
  id: string;
  orderNo: string;
  orderDate: string;
  receiveDate: string | null;
  status: 'pending' | 'received';
  items: CigaretteOrderItem[];
  totalOrderQuantity: number;
  totalReceivedQuantity: number | null;
  totalAmount: number;
  arrivalRate: number | null;
}
