import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import {
  Users,
  UserPlus,
  ShoppingBag,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getCustomerTypeStats } from '@/utils/analytics';
import { customers } from '@/data/customers';

export default function CustomerAnalysis() {
  const { saleOrders } = useData();
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'year'>('90d');

  const dateRange = useMemo(() => {
    const end = dayjs('2026-06-06');
    let start;
    switch (timeRange) {
      case '30d':
        start = end.subtract(30, 'day');
        break;
      case '90d':
        start = end.subtract(90, 'day');
        break;
      case 'year':
        start = end.subtract(1, 'year');
        break;
    }
    return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
  }, [timeRange]);

  const customerStats = useMemo(() => {
    return getCustomerTypeStats(saleOrders, dateRange.start, dateRange.end);
  }, [saleOrders, dateRange]);

  const customerTypeChart = useMemo(() => {
    const data = [
      { value: customerStats.retail.totalAmount, name: '日常散户' },
      { value: customerStats.wedding.totalAmount, name: '婚宴团购' },
      { value: customerStats.bulk.totalAmount, name: '企业团购' },
    ];

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
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 3,
          },
          label: {
            show: false,
          },
          data,
          color: ['#3b82f6', '#ec4899', '#8b5cf6'],
        },
      ],
    };
  }, [customerStats]);

  const categoryBreakdownChart = useMemo(() => {
    const categories = ['白酒', '啤酒', '香烟', '饮料'];
    const retailData = categories.map(cat => {
      const item = customerStats.retail.categoryBreakdown.find(c => c.category === cat);
      return item?.amount || 0;
    });
    const weddingData = categories.map(cat => {
      const item = customerStats.wedding.categoryBreakdown.find(c => c.category === cat);
      return item?.amount || 0;
    });
    const bulkData = categories.map(cat => {
      const item = customerStats.bulk.categoryBreakdown.find(c => c.category === cat);
      return item?.amount || 0;
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['日常散户', '婚宴团购', '企业团购'],
        top: 0,
      },
      grid: {
        left: 60,
        right: 20,
        top: 40,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: categories,
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
          name: '日常散户',
          type: 'bar',
          data: retailData,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barWidth: 20,
        },
        {
          name: '婚宴团购',
          type: 'bar',
          data: weddingData,
          itemStyle: { color: '#ec4899', borderRadius: [4, 4, 0, 0] },
          barWidth: 20,
        },
        {
          name: '企业团购',
          type: 'bar',
          data: bulkData,
          itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
          barWidth: 20,
        },
      ],
    };
  }, [customerStats]);

  const customerTrendChart = useMemo(() => {
    const endDate = dayjs('2026-06-06');
    const months = [];
    const retailCounts = [];
    const weddingCounts = [];
    const bulkCounts = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = endDate.subtract(i, 'month');
      months.push(monthDate.format('M月'));
      
      let retailCount = 0;
      let weddingCount = 0;
      let bulkCount = 0;

      saleOrders.forEach(order => {
        if (order.type === 'out') {
          const orderDate = dayjs(order.date);
          if (orderDate.month() === monthDate.month() && orderDate.year() === monthDate.year()) {
            if (order.customerType === 'retail') retailCount++;
            else if (order.customerType === 'wedding') weddingCount++;
            else if (order.customerType === 'bulk') bulkCount++;
          }
        }
      });

      retailCounts.push(retailCount);
      weddingCounts.push(weddingCount);
      bulkCounts.push(bulkCount);
    }

    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['零售订单', '婚宴订单', '团购订单'],
        top: 0,
      },
      grid: {
        left: 50,
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
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: '零售订单',
          type: 'line',
          data: retailCounts,
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
              ],
            },
          },
        },
        {
          name: '婚宴订单',
          type: 'line',
          data: weddingCounts,
          smooth: true,
          lineStyle: { color: '#ec4899', width: 2 },
          itemStyle: { color: '#ec4899' },
        },
        {
          name: '团购订单',
          type: 'line',
          data: bulkCounts,
          smooth: true,
          lineStyle: { color: '#8b5cf6', width: 2 },
          itemStyle: { color: '#8b5cf6' },
        },
      ],
    };
  }, [saleOrders]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }: any) => {
    const colorClasses: Record<string, string> = {
      primary: 'bg-primary-50 text-primary-600',
      blue: 'bg-blue-50 text-blue-600',
      pink: 'bg-pink-50 text-pink-600',
      purple: 'bg-purple-50 text-purple-600',
    };

    return (
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon size={20} />
          </div>
        </div>
      </div>
    );
  };

  const timeRanges = [
    { value: '30d', label: '近30天' },
    { value: '90d', label: '近90天' },
    { value: 'year', label: '近一年' },
  ];

  const weddingCustomers = customers.filter(c => c.type === 'wedding');
  const bulkCustomers = customers.filter(c => c.type === 'bulk');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value as any)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeRange === range.value
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="零售客户消费"
          value={`¥${customerStats.retail.totalAmount.toLocaleString()}`}
          subtitle={`${customerStats.retail.orderCount}笔订单`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="婚宴客户消费"
          value={`¥${customerStats.wedding.totalAmount.toLocaleString()}`}
          subtitle={`${customerStats.wedding.orderCount}笔订单`}
          icon={UserPlus}
          color="pink"
        />
        <StatCard
          title="团购客户消费"
          value={`¥${customerStats.bulk.totalAmount.toLocaleString()}`}
          subtitle={`${customerStats.bulk.orderCount}笔订单`}
          icon={ShoppingBag}
          color="purple"
        />
        <StatCard
          title="平均客单价"
          value={`¥${Math.round(
            (customerStats.retail.totalAmount + customerStats.wedding.totalAmount + customerStats.bulk.totalAmount) /
            (customerStats.retail.orderCount + customerStats.wedding.orderCount + customerStats.bulk.orderCount)
          ).toLocaleString()}`}
          subtitle="全部客户"
          icon={DollarSign}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">客户类型消费占比</h3>
          <ReactECharts option={customerTypeChart} style={{ height: 280 }} />
        </div>
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">不同客户品类偏好</h3>
          <ReactECharts option={categoryBreakdownChart} style={{ height: 280 }} />
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">订单数量趋势</h3>
        <ReactECharts option={customerTrendChart} style={{ height: 300 }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">婚宴客户TOP</h3>
            <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">VIP客户</span>
          </div>
          <div className="space-y-3">
            {weddingCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-gray-200 text-gray-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.phone} · {customer.totalOrders}笔订单</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-pink-600">¥{customer.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">累计消费</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">团购客户TOP</h3>
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">企业客户</span>
          </div>
          <div className="space-y-3">
            {bulkCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-gray-200 text-gray-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.phone} · {customer.totalOrders}笔订单</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">¥{customer.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">累计消费</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">客户消费特征分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-xl">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Users size={18} />
              日常散户
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">平均客单价</span>
                <span className="font-medium text-blue-800">¥{customerStats.retail.avgOrderAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">消费频次</span>
                <span className="font-medium text-blue-800">高频</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">偏好品类</span>
                <span className="font-medium text-blue-800">香烟、啤酒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">消费特点</span>
                <span className="font-medium text-blue-800">即时性、量小</span>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              建议：优化门店入口陈列，香烟、饮料等便利商品放在显眼位置。
            </p>
          </div>

          <div className="p-4 bg-pink-50 rounded-xl">
            <h4 className="font-semibold text-pink-800 mb-3 flex items-center gap-2">
              <UserPlus size={18} />
              婚宴团购
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-pink-600">平均客单价</span>
                <span className="font-medium text-pink-800">¥{customerStats.wedding.avgOrderAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-600">消费频次</span>
                <span className="font-medium text-pink-800">季节集中</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-600">偏好品类</span>
                <span className="font-medium text-pink-800">中高端白酒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-600">消费特点</span>
                <span className="font-medium text-pink-800">量大、套餐化</span>
              </div>
            </div>
            <p className="text-xs text-pink-600 mt-3">
              建议：推出婚宴酒水套餐，提前储备节庆爆款白酒。
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl">
            <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
              <ShoppingBag size={18} />
              企业团购
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-600">平均客单价</span>
                <span className="font-medium text-purple-800">¥{customerStats.bulk.avgOrderAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">消费频次</span>
                <span className="font-medium text-purple-800">稳定重复</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">偏好品类</span>
                <span className="font-medium text-purple-800">全品类</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">消费特点</span>
                <span className="font-medium text-purple-800">计划性、议价</span>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-3">
              建议：建立VIP客户体系，提供专属价格和配送服务。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
