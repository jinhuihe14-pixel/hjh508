import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import {
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getStockInfoList } from '@/utils/analytics';
import type { Category } from '@/types';

export default function Inventory() {
  const { products, saleOrders, purchaseOrders, allOrders } = useData();
  const [activeTab, setActiveTab] = useState<'stock' | 'in' | 'out'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const stockInfo = useMemo(() => {
    return getStockInfoList(saleOrders, purchaseOrders, '2026-06-06');
  }, [saleOrders, purchaseOrders]);

  const filteredStock = useMemo(() => {
    return stockInfo.filter(item => {
      const matchSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [stockInfo, searchTerm, categoryFilter]);

  const inOrders = useMemo(() => {
    return purchaseOrders
      .filter(o => o.type === 'in')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
  }, [purchaseOrders]);

  const outOrders = useMemo(() => {
    return saleOrders
      .filter(o => o.type === 'out')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
  }, [saleOrders]);

  const stockSummary = useMemo(() => {
    const categories: Category[] = ['白酒', '啤酒', '香烟', '饮料'];
    return categories.map(cat => {
      const items = stockInfo.filter(s => s.category === cat);
      const totalValue = items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + item.currentStock * (product?.costPrice || 0);
      }, 0);
      const totalStock = items.reduce((sum, item) => sum + item.currentStock, 0);
      return {
        category: cat,
        totalStock,
        totalValue: Math.round(totalValue),
        itemCount: items.length,
      };
    });
  }, [stockInfo, products]);

  const stockChartOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['库存量', '库存价值'],
        right: 10,
      },
      grid: {
        left: 60,
        right: 60,
        top: 40,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: stockSummary.map(s => s.category),
        axisLabel: {
          color: '#6b7280',
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '库存量',
          axisLabel: {
            color: '#6b7280',
          },
          splitLine: {
            lineStyle: {
              color: '#f3f4f6',
            },
          },
        },
        {
          type: 'value',
          name: '价值(元)',
          axisLabel: {
            color: '#6b7280',
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '库存量',
          type: 'bar',
          data: stockSummary.map(s => s.totalStock),
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 30,
        },
        {
          name: '库存价值',
          type: 'line',
          yAxisIndex: 1,
          data: stockSummary.map(s => s.totalValue),
          smooth: true,
          lineStyle: {
            color: '#ee7612',
            width: 2,
          },
          itemStyle: {
            color: '#ee7612',
          },
        },
      ],
    };
  }, [stockSummary]);

  const categories: (Category | 'all')[] = ['all', '白酒', '啤酒', '香烟', '饮料'];

  const getStockStatus = (productId: string, currentStock: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 'normal';
    if (currentStock < product.minStock) return 'low';
    if (currentStock > product.maxStock) return 'high';
    return 'normal';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex bg-white rounded-lg p-1 shadow-sm">
          {[
            { key: 'stock', label: '库存总览', icon: Package },
            { key: 'in', label: '入库记录', icon: ArrowDownCircle },
            { key: 'out', label: '出库记录', icon: ArrowUpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'stock' && (
        <>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">库存品类分布</h3>
            <ReactECharts option={stockChartOption} style={{ height: 280 }} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">库存明细</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索商品..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-60"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Filter size={16} />
                    {categoryFilter === 'all' ? '全部分类' : categoryFilter}
                    <ChevronDown size={16} />
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setCategoryFilter(cat);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                            categoryFilter === cat ? 'text-primary-600 bg-primary-50' : 'text-gray-600'
                          }`}
                        >
                          {cat === 'all' ? '全部分类' : cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">商品名称</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分类</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">当前库存</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">日均销量</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">可售天数</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">库存状态</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">最近入库</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">最近出库</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item) => {
                    const status = getStockStatus(item.productId, item.currentStock);
                    const statusConfig = {
                      low: { label: '库存不足', color: 'text-red-600 bg-red-50' },
                      normal: { label: '正常', color: 'text-green-600 bg-green-50' },
                      high: { label: '库存过高', color: 'text-amber-600 bg-amber-50' },
                    };
                    return (
                      <tr key={item.productId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.productName}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{item.category}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-800">{item.currentStock}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">{item.avgDailySale}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {item.daysOfStock >= 999 ? '∞' : `${item.daysOfStock}天`}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[status].color}`}>
                            {statusConfig[status].label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{item.lastInDate}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{item.lastOutDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'in' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">入库记录</h3>
          <div className="space-y-3">
            {inOrders.map((order) => (
              <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{order.orderNo}</span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">入库</span>
                  </div>
                  <span className="text-sm text-gray-500">{order.date}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span key={item.productId} className="text-xs bg-white px-2 py-1 rounded text-gray-600">
                      {item.productName} × {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-xs text-gray-400">+{order.items.length - 3}项</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{order.remark || '常规补货'}</span>
                  <span className="text-sm font-medium text-green-600">¥{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'out' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">出库记录</h3>
          <div className="space-y-3">
            {outOrders.map((order) => {
              const typeLabel = {
                retail: '零售',
                wedding: '婚宴',
                bulk: '团购',
              };
              const typeColor = {
                retail: 'bg-blue-100 text-blue-700',
                wedding: 'bg-pink-100 text-pink-700',
                bulk: 'bg-purple-100 text-purple-700',
              };
              return (
                <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{order.orderNo}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${typeColor[order.customerType || 'retail']}`}>
                        {typeLabel[order.customerType || 'retail']}
                      </span>
                      {order.customerName && (
                        <span className="text-xs text-gray-500">{order.customerName}</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{order.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.productId} className="text-xs bg-white px-2 py-1 rounded text-gray-600">
                        {item.productName} × {item.quantity}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-xs text-gray-400">+{order.items.length - 3}项</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-primary-600">¥{order.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
