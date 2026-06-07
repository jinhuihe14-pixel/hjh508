import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import {
  TrendingUp,
  Calendar,
  AlertTriangle,
  Percent,
  DollarSign,
  ChevronDown,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getSaleAnalysis, getFestivalSaleAnalysis } from '@/utils/analytics';
import { festivals } from '@/data/customers';
import { products } from '@/data/products';
import type { Category } from '@/types';

export default function SalesAnalysis() {
  const { saleOrders } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'festival' | 'slow'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedFestival, setSelectedFestival] = useState<string>('f202602');

  const saleAnalysis = useMemo(() => {
    return getSaleAnalysis(saleOrders, selectedPeriod, '2026-06-06');
  }, [saleOrders, selectedPeriod]);

  const filteredAnalysis = useMemo(() => {
    return saleAnalysis.filter(item => {
      return selectedCategory === 'all' || item.category === selectedCategory;
    }).sort((a, b) => b.saleAmount - a.saleAmount);
  }, [saleAnalysis, selectedCategory]);

  const overviewStats = useMemo(() => {
    const totalAmount = filteredAnalysis.reduce((sum, item) => sum + item.saleAmount, 0);
    const totalProfit = filteredAnalysis.reduce((sum, item) => sum + item.profit, 0);
    const totalQuantity = filteredAnalysis.reduce((sum, item) => sum + item.saleQuantity, 0);
    const avgProfitRate = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

    return {
      totalAmount: Math.round(totalAmount),
      totalProfit: Math.round(totalProfit),
      totalQuantity,
      avgProfitRate: Math.round(avgProfitRate * 10) / 10,
    };
  }, [filteredAnalysis]);

  const categoryChartOption = useMemo(() => {
    const categoryMap = new Map<Category, { amount: number; profit: number }>();
    
    filteredAnalysis.forEach(item => {
      const existing = categoryMap.get(item.category) || { amount: 0, profit: 0 };
      categoryMap.set(item.category, {
        amount: existing.amount + item.saleAmount,
        profit: existing.profit + item.profit,
      });
    });

    const categories = Array.from(categoryMap.keys());
    const amounts = categories.map(c => categoryMap.get(c)?.amount || 0);
    const profits = categories.map(c => categoryMap.get(c)?.profit || 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
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
          name: '销售额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#ee7612',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 30,
        },
        {
          name: '利润',
          type: 'bar',
          data: profits,
          itemStyle: {
            color: '#10b981',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 30,
        },
      ],
    };
  }, [filteredAnalysis]);

  const topProductsChartOption = useMemo(() => {
    const top10 = filteredAnalysis.slice(0, 10).reverse();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          return `${params[0].name}<br/>销售额: ¥${params[0].value.toLocaleString()}`;
        },
      },
      grid: {
        left: 120,
        right: 40,
        top: 20,
        bottom: 30,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#6b7280',
          formatter: (value: number) => `¥${(value / 1000).toFixed(0)}k`,
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: top10.map(p => p.productName),
        axisLabel: {
          color: '#374151',
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'bar',
          data: top10.map(p => p.saleAmount),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#f6ba6d' },
                { offset: 1, color: '#ee7612' },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
          barWidth: 18,
        },
      ],
    };
  }, [filteredAnalysis]);

  const festivalAnalysis = useMemo(() => {
    return getFestivalSaleAnalysis(saleOrders, selectedFestival);
  }, [saleOrders, selectedFestival]);

  const festivalChartOption = useMemo(() => {
    if (!festivalAnalysis) return {};
    const topProducts = festivalAnalysis.topProducts.slice(0, 8).reverse();
    
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: 120,
        right: 40,
        top: 20,
        bottom: 30,
      },
      xAxis: {
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
      yAxis: {
        type: 'category',
        data: topProducts.map(p => p.productName),
        axisLabel: {
          color: '#374151',
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'bar',
          data: topProducts.map(p => p.amount),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#f472b6' },
                { offset: 1, color: '#db2777' },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
          barWidth: 18,
        },
      ],
    };
  }, [festivalAnalysis]);

  const festivalCategoryChart = useMemo(() => {
    if (!festivalAnalysis) return {};
    
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
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          data: festivalAnalysis.categoryStats.map(c => ({
            value: c.amount,
            name: c.category,
          })),
          color: ['#ee7612', '#10b981', '#3b82f6', '#8b5cf6'],
        },
      ],
    };
  }, [festivalAnalysis]);

  const slowMovingItems = useMemo(() => {
    return saleAnalysis
      .filter(item => item.isSlowMoving)
      .sort((a, b) => b.slowMovingDays - a.slowMovingDays);
  }, [saleAnalysis]);

  const yearsComparisonChart = useMemo(() => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const data2024 = new Array(12).fill(0);
    const data2025 = new Array(12).fill(0);
    const data2026 = new Array(12).fill(0);

    saleOrders.forEach(order => {
      if (order.type === 'out') {
        const date = dayjs(order.date);
        const year = date.year();
        const month = date.month();
        
        if (year === 2024) {
          data2024[month] += order.totalAmount;
        } else if (year === 2025) {
          data2025[month] += order.totalAmount;
        } else if (year === 2026) {
          data2026[month] += order.totalAmount;
        }
      }
    });

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
        data: ['2024年', '2025年', '2026年'],
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
          name: '2024年',
          type: 'line',
          data: data2024,
          smooth: true,
          lineStyle: {
            color: '#94a3b8',
            width: 2,
            type: 'dashed',
          },
          itemStyle: {
            color: '#94a3b8',
          },
        },
        {
          name: '2025年',
          type: 'line',
          data: data2025,
          smooth: true,
          lineStyle: {
            color: '#60a5fa',
            width: 2,
          },
          itemStyle: {
            color: '#60a5fa',
          },
        },
        {
          name: '2026年',
          type: 'line',
          data: data2026,
          smooth: true,
          lineStyle: {
            color: '#ee7612',
            width: 3,
          },
          itemStyle: {
            color: '#ee7612',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(238, 118, 18, 0.3)' },
                { offset: 1, color: 'rgba(238, 118, 18, 0.05)' },
              ],
            },
          },
        },
      ],
    };
  }, [saleOrders]);

  const StatCard = ({ title, value, icon: Icon, color = 'primary', suffix = '' }: any) => {
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
            <p className="text-xl font-bold text-gray-800">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon size={20} />
          </div>
        </div>
      </div>
    );
  };

  const categories: (Category | 'all')[] = ['all', '白酒', '啤酒', '香烟', '饮料'];
  const periods: { value: 'month' | 'quarter' | 'year'; label: string }[] = [
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '本年' },
  ];

  const upcomingFestivals = festivals.filter(f => {
    const festivalDate = dayjs(f.date);
    return festivalDate.isAfter(dayjs('2026-06-06')) && f.year === 2026;
  });

  const historicalFestivals = festivals
    .filter(f => f.year < 2026 || dayjs(f.date).isBefore(dayjs('2026-06-06')))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-lg p-1 shadow-sm w-fit">
        {[
          { key: 'overview', label: '销售总览', icon: TrendingUp },
          { key: 'festival', label: '节日分析', icon: Calendar },
          { key: 'slow', label: '滞销商品', icon: AlertTriangle },
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

      {activeTab === 'overview' && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPeriod(p.value)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === p.value
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                {selectedCategory === 'all' ? '全部分类' : selectedCategory}
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="销售总额" value={`¥${overviewStats.totalAmount.toLocaleString()}`} icon={DollarSign} color="primary" />
            <StatCard title="利润总额" value={`¥${overviewStats.totalProfit.toLocaleString()}`} icon={TrendingUp} color="green" />
            <StatCard title="平均利润率" value={overviewStats.avgProfitRate} icon={Percent} color="blue" suffix="%" />
            <StatCard title="销售数量" value={overviewStats.totalQuantity} icon={TrendingUp} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">各品类销售对比</h3>
              <ReactECharts option={categoryChartOption} style={{ height: 300 }} />
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">商品销售排行</h3>
              <ReactECharts option={topProductsChartOption} style={{ height: 300 }} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">历年销售趋势对比</h3>
            <ReactECharts option={yearsComparisonChart} style={{ height: 350 }} />
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">商品销售明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">商品名称</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分类</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">品牌</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">销售数量</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">销售额</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">利润</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">利润率</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">动销率</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalysis.slice(0, 20).map((item) => (
                    <tr key={item.productId} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.productName}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{item.category}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{item.brand}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.saleQuantity}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-800">¥{item.saleAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-green-600">¥{item.profit.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.profitRate}%</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.turnoverRate >= 2 ? 'bg-green-100 text-green-700' :
                          item.turnoverRate >= 1 ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {item.turnoverRate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'festival' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <h4 className="text-sm font-medium text-gray-500">选择节日</h4>
              {upcomingFestivals.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-primary-600 font-medium mb-2">即将到来</p>
                  {upcomingFestivals.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFestival(f.id)}
                      className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                        selectedFestival === f.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">{f.name}</p>
                      <p className="text-xs text-gray-500">{f.date}</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 font-medium mb-2">历史节日</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {historicalFestivals.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFestival(f.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedFestival === f.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800">{f.year}年{f.name}</p>
                    <p className="text-xs text-gray-500">{f.date}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              {festivalAnalysis && (
                <>
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {festivalAnalysis.festivalYear}年{festivalAnalysis.festivalName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {festivalAnalysis.startDate} 至 {festivalAnalysis.endDate}
                        </p>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">总销售额</p>
                          <p className="text-xl font-bold text-primary-600">
                            ¥{festivalAnalysis.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">总销量</p>
                          <p className="text-xl font-bold text-gray-800">
                            {festivalAnalysis.totalQuantity.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">热销商品排行</h3>
                      <ReactECharts option={festivalChartOption} style={{ height: 320 }} />
                    </div>
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">品类销售占比</h3>
                      <ReactECharts option={festivalCategoryChart} style={{ height: 320 }} />
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">备货建议</h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-amber-800">
                        <span className="font-medium">参考{festivalAnalysis.festivalYear - 1}年同节日数据，</span>
                        建议提前{festivalAnalysis.festivalName === '春节' ? '30' : '15'}天开始备货，
                        备货量建议在历史数据基础上增加10%-20%以应对增长需求。
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">商品名称</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分类</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">历史销量</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">历史销售额</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">建议备货量</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">预估成本</th>
                          </tr>
                        </thead>
                        <tbody>
                          {festivalAnalysis.topProducts.slice(0, 8).map((item) => {
                            const suggestedQty = Math.ceil(item.quantity * 1.2);
                            const product = products.find(p => p.id === item.productId);
                            const estimatedCost = product ? suggestedQty * product.costPrice : 0;
                            return (
                              <tr key={item.productId} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.productName}</td>
                                <td className="py-3 px-4 text-sm text-gray-500">{item.category}</td>
                                <td className="py-3 px-4 text-sm text-right text-gray-600">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right text-gray-600">¥{item.amount.toLocaleString()}</td>
                                <td className="py-3 px-4 text-sm text-right font-medium text-primary-600">{suggestedQty}</td>
                                <td className="py-3 px-4 text-sm text-right text-green-600">¥{Math.round(estimatedCost).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'slow' && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">滞销商品清单</h3>
              </div>
              <span className="text-sm text-gray-500">共 {slowMovingItems.length} 款商品滞销超过90天</span>
            </div>

            {slowMovingItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="text-green-600" size={32} />
                </div>
                <p className="text-gray-500">暂无滞销商品，销售状况良好！</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <span className="font-medium">运营建议：</span>
                    以下商品连续90天以上未产生销售，建议门店采取打折促销、捆绑销售、调换货等方式清理库存，
                    释放资金占用。建议折扣力度在原价基础上8折起，对于积压超过180天的商品可考虑5折清仓。
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">排名</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">商品名称</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分类</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">品牌</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">滞销天数</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">本期销量</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">动销率</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">滞销等级</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slowMovingItems.map((item, index) => {
                        let level = '轻度滞销';
                        let levelColor = 'bg-amber-100 text-amber-700';
                        if (item.slowMovingDays >= 180) {
                          level = '严重滞销';
                          levelColor = 'bg-red-100 text-red-700';
                        } else if (item.slowMovingDays >= 120) {
                          level = '中度滞销';
                          levelColor = 'bg-orange-100 text-orange-700';
                        }

                        return (
                          <tr key={item.productId} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.productName}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">{item.category}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">{item.brand}</td>
                            <td className="py-3 px-4 text-sm text-right font-medium text-red-600">{item.slowMovingDays}天</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-600">{item.saleQuantity}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-600">{item.turnoverRate}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColor}`}>
                                {level}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
