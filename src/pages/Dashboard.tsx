import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getStockInfoList, getMonthlySales, getSaleAnalysis } from '@/utils/analytics';
import { products } from '@/data/products';

export default function Dashboard() {
  const { saleOrders, purchaseOrders } = useData();

  const stats = useMemo(() => {
    const today = dayjs('2026-06-06');
    const thisMonthStart = today.startOf('month');
    const lastMonthStart = today.subtract(1, 'month').startOf('month');
    const lastMonthEnd = today.subtract(1, 'month').endOf('month');

    let thisMonthSales = 0;
    let lastMonthSales = 0;
    let thisMonthProfit = 0;
    let lastMonthProfit = 0;
    let thisMonthOrders = 0;
    let lastMonthOrders = 0;

    const productMap = new Map(products.map(p => [p.id, p]));

    saleOrders.forEach(order => {
      if (order.type === 'out') {
        const orderDate = dayjs(order.date);
        const isThisMonth = (orderDate.isAfter(thisMonthStart) || orderDate.isSame(thisMonthStart, 'day')) &&
          (orderDate.isBefore(today) || orderDate.isSame(today, 'day'));
        const isLastMonth = (orderDate.isAfter(lastMonthStart) || orderDate.isSame(lastMonthStart, 'day')) &&
          (orderDate.isBefore(lastMonthEnd) || orderDate.isSame(lastMonthEnd, 'day'));

        if (isThisMonth) {
          thisMonthSales += order.totalAmount;
          thisMonthOrders++;
          order.items.forEach(item => {
            const product = productMap.get(item.productId);
            if (product) {
              thisMonthProfit += (item.unitPrice - product.costPrice) * item.quantity;
            }
          });
        }
        if (isLastMonth) {
          lastMonthSales += order.totalAmount;
          lastMonthOrders++;
          order.items.forEach(item => {
            const product = productMap.get(item.productId);
            if (product) {
              lastMonthProfit += (item.unitPrice - product.costPrice) * item.quantity;
            }
          });
        }
      }
    });

    const salesGrowth = lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;
    const profitGrowth = lastMonthProfit > 0 ? ((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100 : 0;
    const orderGrowth = lastMonthOrders > 0 ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0;

    return {
      thisMonthSales: Math.round(thisMonthSales * 100) / 100,
      lastMonthSales: Math.round(lastMonthSales * 100) / 100,
      thisMonthProfit: Math.round(thisMonthProfit * 100) / 100,
      lastMonthProfit: Math.round(lastMonthProfit * 100) / 100,
      thisMonthOrders,
      lastMonthOrders,
      salesGrowth: Math.round(salesGrowth * 10) / 10,
      profitGrowth: Math.round(profitGrowth * 10) / 10,
      orderGrowth: Math.round(orderGrowth * 10) / 10,
    };
  }, [saleOrders]);

  const stockInfo = useMemo(() => {
    return getStockInfoList(saleOrders, purchaseOrders, '2026-06-06');
  }, [saleOrders, purchaseOrders]);

  const lowStockItems = useMemo(() => {
    const productMap = new Map(products.map(p => [p.id, p]));
    return stockInfo
      .filter(item => {
        const product = productMap.get(item.productId);
        return product && item.currentStock < product.minStock;
      })
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 5);
  }, [stockInfo]);

  const slowMovingItems = useMemo(() => {
    const analysis = getSaleAnalysis(saleOrders, 'year', '2026-06-06');
    return analysis
      .filter(item => item.isSlowMoving)
      .sort((a, b) => b.slowMovingDays - a.slowMovingDays)
      .slice(0, 5);
  }, [saleOrders]);

  const monthlySales = useMemo(() => {
    return getMonthlySales(saleOrders, 2026);
  }, [saleOrders]);

  const salesChartOption = useMemo(() => {
    const months = monthlySales.map(d => `${d.month}月`);
    const amounts = monthlySales.map(d => d.amount);
    const profits = monthlySales.map(d => d.profit);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `${params[0].axisValue}<br/>`;
          params.forEach((param: any) => {
            result += `${param.marker} ${param.seriesName}: ¥${param.value.toLocaleString()}<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['销售额', '利润'],
        right: 10,
      },
      grid: {
        left: 60,
        right: 20,
        top: 40,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: {
          color: '#6b7280',
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#6b7280',
          formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万`,
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: '销售额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#f19333' },
                { offset: 1, color: '#ee7612' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 24,
        },
        {
          name: '利润',
          type: 'line',
          data: profits,
          smooth: true,
          lineStyle: {
            color: '#10b981',
            width: 2,
          },
          itemStyle: {
            color: '#10b981',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
              ],
            },
          },
        },
      ],
    };
  }, [monthlySales]);

  const categoryChartOption = useMemo(() => {
    const categories = ['白酒', '啤酒', '香烟', '饮料'];
    const amounts = [0, 0, 0, 0];

    saleOrders.forEach(order => {
      if (order.type === 'out' && dayjs(order.date).year() === 2026) {
        order.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const index = categories.indexOf(product.category);
            if (index >= 0) {
              amounts[index] += item.amount;
            }
          }
        });
      }
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ¥{c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          data: categories.map((cat, i) => ({
            value: Math.round(amounts[i]),
            name: cat,
          })),
          color: ['#ee7612', '#10b981', '#3b82f6', '#8b5cf6'],
        },
      ],
    };
  }, [saleOrders]);

  const StatCard = ({
    title,
    value,
    growth,
    icon: Icon,
    color = 'primary',
  }: {
    title: string;
    value: string;
    growth: number;
    icon: any;
    color?: string;
  }) => {
    const isPositive = growth >= 0;
    const colorClasses: Record<string, string> = {
      primary: 'bg-primary-50 text-primary-600',
      green: 'bg-green-50 text-green-600',
      blue: 'bg-blue-50 text-blue-600',
      amber: 'bg-amber-50 text-amber-600',
    };

    return (
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{isPositive ? '+' : ''}{growth}%</span>
              <span className="text-gray-400">较上月</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="本月销售额"
          value={`¥${stats.thisMonthSales.toLocaleString()}`}
          growth={stats.salesGrowth}
          icon={DollarSign}
          color="primary"
        />
        <StatCard
          title="本月利润"
          value={`¥${stats.thisMonthProfit.toLocaleString()}`}
          growth={stats.profitGrowth}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="本月订单数"
          value={stats.thisMonthOrders.toString()}
          growth={stats.orderGrowth}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="库存商品数"
          value={stockInfo.length.toString()}
          growth={0}
          icon={Package}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">2026年销售趋势</h3>
          <ReactECharts option={salesChartOption} style={{ height: 320 }} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">品类销售占比</h3>
          <ReactECharts option={categoryChartOption} style={{ height: 320 }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">库存预警</h3>
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div className="space-y-3">
            {lowStockItems.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无库存预警</p>
            ) : (
              lowStockItems.map((item) => {
                const product = products.find(p => p.id === item.productId);
                const stockPercent = product ? (item.currentStock / product.minStock) * 100 : 0;
                return (
                  <div key={item.productId} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{item.productName}</span>
                        <span className="text-gray-500">{item.currentStock} / {product?.minStock || 0}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stockPercent < 50 ? 'bg-red-500' : stockPercent < 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, stockPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">滞销商品TOP5</h3>
            <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full">90天以上</span>
          </div>
          <div className="space-y-3">
            {slowMovingItems.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无滞销商品</p>
            ) : (
              slowMovingItems.map((item, index) => (
                <div key={item.productId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.category} · {item.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{item.slowMovingDays}天</p>
                    <p className="text-xs text-gray-400">未动销</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
