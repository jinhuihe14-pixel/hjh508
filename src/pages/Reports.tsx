import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  Package,
  Users,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getSaleAnalysis, getMonthlySales, getCustomerTypeStats } from '@/utils/analytics';
import { products } from '@/data/products';

export default function Reports() {
  const { saleOrders, purchaseOrders } = useData();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [exporting, setExporting] = useState(false);

  const years = [2024, 2025, 2026];

  const yearlyStats = useMemo(() => {
    return years.map(year => {
      const monthlySales = getMonthlySales(saleOrders, year);
      const totalAmount = monthlySales.reduce((sum, m) => sum + m.amount, 0);
      const totalProfit = monthlySales.reduce((sum, m) => sum + m.profit, 0);
      const totalOrders = monthlySales.reduce((sum, m) => sum + m.orderCount, 0);
      
      return {
        year,
        totalAmount: Math.round(totalAmount),
        totalProfit: Math.round(totalProfit),
        totalOrders,
        monthlyData: monthlySales,
      };
    });
  }, [saleOrders]);

  const yearComparison = useMemo(() => {
    const currentYear = yearlyStats.find(y => y.year === selectedYear);
    const lastYear = yearlyStats.find(y => y.year === selectedYear - 1);
    
    if (!currentYear) return null;
    
    const amountGrowth = lastYear && lastYear.totalAmount > 0
      ? ((currentYear.totalAmount - lastYear.totalAmount) / lastYear.totalAmount) * 100
      : 0;
    const profitGrowth = lastYear && lastYear.totalProfit > 0
      ? ((currentYear.totalProfit - lastYear.totalProfit) / lastYear.totalProfit) * 100
      : 0;
    const orderGrowth = lastYear && lastYear.totalOrders > 0
      ? ((currentYear.totalOrders - lastYear.totalOrders) / lastYear.totalOrders) * 100
      : 0;

    return {
      current: currentYear,
      last: lastYear,
      amountGrowth: Math.round(amountGrowth * 10) / 10,
      profitGrowth: Math.round(profitGrowth * 10) / 10,
      orderGrowth: Math.round(orderGrowth * 10) / 10,
    };
  }, [yearlyStats, selectedYear]);

  const seasonAnalysis = useMemo(() => {
    const seasons = [
      { name: '春季', months: [2, 3, 4] },
      { name: '夏季', months: [5, 6, 7] },
      { name: '秋季', months: [8, 9, 10] },
      { name: '冬季', months: [11, 0, 1] },
    ];

    return seasons.map(season => {
      const currentYearData = yearlyStats.find(y => y.year === selectedYear);
      const lastYearData = yearlyStats.find(y => y.year === selectedYear - 1);
      
      const currentAmount = season.months.reduce((sum, month) => {
        const monthData = currentYearData?.monthlyData.find(m => m.month === month + 1);
        return sum + (monthData?.amount || 0);
      }, 0);
      
      const lastAmount = season.months.reduce((sum, month) => {
        const monthData = lastYearData?.monthlyData.find(m => m.month === month + 1);
        return sum + (monthData?.amount || 0);
      }, 0);

      const growth = lastAmount > 0 ? ((currentAmount - lastAmount) / lastAmount) * 100 : 0;

      return {
        name: season.name,
        currentAmount: Math.round(currentAmount),
        lastAmount: Math.round(lastAmount),
        growth: Math.round(growth * 10) / 10,
      };
    });
  }, [yearlyStats, selectedYear]);

  const categoryByMonth = useMemo(() => {
    const categories = ['白酒', '啤酒', '香烟', '饮料'] as const;
    const monthlyCategoryData: { month: number; [key: string]: number }[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthData: { month: number; [key: string]: number } = { month: m };
      categories.forEach(cat => {
        monthData[cat] = 0;
      });

      saleOrders.forEach(order => {
        if (order.type === 'out') {
          const orderDate = dayjs(order.date);
          if (orderDate.year() === selectedYear && orderDate.month() + 1 === m) {
            order.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (product && categories.includes(product.category as any)) {
                monthData[product.category] += item.amount;
              }
            });
          }
        }
      });

      monthlyCategoryData.push(monthData);
    }

    return { categories, data: monthlyCategoryData };
  }, [saleOrders, selectedYear]);

  const exportMonthlyReport = () => {
    setExporting(true);
    
    const monthlyData = yearlyStats.find(y => y.year === selectedYear)?.monthlyData || [];
    
    const sheetData = monthlyData.map(m => ({
      '月份': `${m.month}月`,
      '销售额(元)': Math.round(m.amount),
      '利润(元)': Math.round(m.profit),
      '订单数': m.orderCount,
      '平均客单价(元)': m.orderCount > 0 ? Math.round(m.amount / m.orderCount) : 0,
      '利润率(%)': m.amount > 0 ? Math.round((m.profit / m.amount) * 1000) / 10 : 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    
    ws['!cols'] = [
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '月度销售报表');

    const categorySheetData = categoryByMonth.data.map(m => ({
      '月份': `${m.month}月`,
      '白酒(元)': Math.round(m['白酒']),
      '啤酒(元)': Math.round(m['啤酒']),
      '香烟(元)': Math.round(m['香烟']),
      '饮料(元)': Math.round(m['饮料']),
    }));
    const ws2 = XLSX.utils.json_to_sheet(categorySheetData);
    ws2['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws2, '品类月度分析');

    XLSX.writeFile(wb, `${selectedYear}年烟酒专营店经营报表.xlsx`);
    setExporting(false);
  };

  const exportSalesAnalysis = () => {
    setExporting(true);
    
    const analysis = getSaleAnalysis(saleOrders, 'year', `${selectedYear}-12-31`);
    
    const sheetData = analysis.map(a => ({
      '商品名称': a.productName,
      '分类': a.category,
      '品牌': a.brand,
      '销售数量': a.saleQuantity,
      '销售额(元)': Math.round(a.saleAmount),
      '利润(元)': Math.round(a.profit),
      '利润率(%)': a.profitRate,
      '动销率': a.turnoverRate,
      '是否滞销': a.isSlowMoving ? '是' : '否',
      '滞销天数': a.slowMovingDays,
    })).sort((a, b) => b['销售额(元)'] - a['销售额(元)']);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '商品销售分析');
    XLSX.writeFile(wb, `${selectedYear}年商品销售分析报表.xlsx`);
    setExporting(false);
  };

  const exportCustomerReport = () => {
    setExporting(true);
    
    const customerStats = getCustomerTypeStats(
      saleOrders,
      `${selectedYear}-01-01`,
      `${selectedYear}-12-31`
    );

    const sheetData = [
      {
        '客户类型': '日常散户',
        '订单数': customerStats.retail.orderCount,
        '总金额(元)': Math.round(customerStats.retail.totalAmount),
        '平均客单价(元)': Math.round(customerStats.retail.avgOrderAmount),
      },
      {
        '客户类型': '婚宴团购',
        '订单数': customerStats.wedding.orderCount,
        '总金额(元)': Math.round(customerStats.wedding.totalAmount),
        '平均客单价(元)': Math.round(customerStats.wedding.avgOrderAmount),
      },
      {
        '客户类型': '企业团购',
        '订单数': customerStats.bulk.orderCount,
        '总金额(元)': Math.round(customerStats.bulk.totalAmount),
        '平均客单价(元)': Math.round(customerStats.bulk.avgOrderAmount),
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, '客户分析报表');
    XLSX.writeFile(wb, `${selectedYear}年客户分析报表.xlsx`);
    setExporting(false);
  };

  const ReportCard = ({ title, description, icon: Icon, onExport, color = 'primary' }: any) => {
    const colorClasses: Record<string, string> = {
      primary: 'bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100',
      blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    };

    return (
      <div className="card hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            color === 'primary' ? 'bg-primary-100 text-primary-600' :
            color === 'blue' ? 'bg-blue-100 text-blue-600' :
            color === 'green' ? 'bg-green-100 text-green-600' :
            'bg-purple-100 text-purple-600'
          }`}>
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
            <p className="text-sm text-gray-500 mb-3">{description}</p>
            <button
              onClick={onExport}
              disabled={exporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${colorClasses[color]}`}
            >
              <Download size={16} />
              导出报表
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">选择年份：</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedYear === year
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {year}年
              </button>
            ))}
          </div>
        </div>
      </div>

      {yearComparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">年度销售额</span>
              <BarChart3 className="text-primary-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              ¥{yearComparison.current.totalAmount.toLocaleString()}
            </p>
            <p className={`text-sm mt-1 ${yearComparison.amountGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {yearComparison.amountGrowth >= 0 ? '↑' : '↓'} {Math.abs(yearComparison.amountGrowth)}% 同比
            </p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">年度利润</span>
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              ¥{yearComparison.current.totalProfit.toLocaleString()}
            </p>
            <p className={`text-sm mt-1 ${yearComparison.profitGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {yearComparison.profitGrowth >= 0 ? '↑' : '↓'} {Math.abs(yearComparison.profitGrowth)}% 同比
            </p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">年度订单</span>
              <Package className="text-blue-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {yearComparison.current.totalOrders.toLocaleString()}
            </p>
            <p className={`text-sm mt-1 ${yearComparison.orderGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {yearComparison.orderGrowth >= 0 ? '↑' : '↓'} {Math.abs(yearComparison.orderGrowth)}% 同比
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="text-primary-500" size={20} />
          淡旺季分析
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {seasonAnalysis.map((season) => (
            <div
              key={season.name}
              className={`p-4 rounded-xl border-2 ${
                season.growth >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <p className="text-sm font-medium text-gray-600 mb-1">{season.name}</p>
              <p className="text-xl font-bold text-gray-800">
                ¥{(season.currentAmount / 10000).toFixed(1)}万
              </p>
              <p className={`text-sm mt-1 ${season.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {season.growth >= 0 ? '↑' : '↓'} {Math.abs(season.growth)}% 同比
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">
          <span className="font-medium">分析建议：</span>
          根据淡旺季特点，旺季（{seasonAnalysis
            .sort((a, b) => b.currentAmount - a.currentAmount)
            .slice(0, 2)
            .map(s => s.name)
            .join('、')}）前提前备货，淡季优化库存结构，减少资金占用。
        </p>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">跨年份月度对比</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">月份</th>
                {years.map(year => (
                  <th key={year} className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {year}年销售额
                  </th>
                ))}
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">同比增长</th>
              </tr>
            </thead>
            <tbody>
              {yearComparison?.current.monthlyData.map((month, index) => {
                const lastYearMonth = yearComparison.last?.monthlyData[index];
                const growth = lastYearMonth && lastYearMonth.amount > 0
                  ? ((month.amount - lastYearMonth.amount) / lastYearMonth.amount) * 100
                  : 0;
                return (
                  <tr key={month.month} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{month.month}月</td>
                    {years.map(year => {
                      const yearData = yearlyStats.find(y => y.year === year);
                      const monthData = yearData?.monthlyData.find(m => m.month === month.month);
                      return (
                        <td key={year} className="py-3 px-4 text-sm text-right text-gray-600">
                          ¥{monthData ? Math.round(monthData.amount).toLocaleString() : '-'}
                        </td>
                      );
                    })}
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      growth >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {lastYearMonth ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">报表导出</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportCard
            title="月度经营报表"
            description="包含月度销售额、利润、订单数等核心指标"
            icon={FileText}
            onExport={exportMonthlyReport}
            color="primary"
          />
          <ReportCard
            title="商品销售分析"
            description="包含所有商品销量、销售额、利润、动销率"
            icon={BarChart3}
            onExport={exportSalesAnalysis}
            color="blue"
          />
          <ReportCard
            title="客户分析报表"
            description="包含不同客户类型的消费特征统计"
            icon={Users}
            onExport={exportCustomerReport}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}
