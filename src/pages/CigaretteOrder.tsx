import { useMemo, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  Download,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getCigaretteOrderDemand } from '@/utils/analytics';
import * as XLSX from 'xlsx';

export default function CigaretteOrder() {
  const { saleOrders, purchaseOrders } = useData();
  const orderDemand = useMemo(() => {
    return getCigaretteOrderDemand(saleOrders, purchaseOrders);
  }, [saleOrders, purchaseOrders]);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const urgentItems = orderDemand.filter(item => item.isUrgent);
  const normalItems = orderDemand.filter(item => !item.isUrgent);

  const totalSuggested = orderDemand.reduce((sum, item) => sum + item.suggestedOrder, 0);
  const totalUrgent = urgentItems.length;
  const daysUntilOrder = orderDemand[0]?.daysUntilNextOrder || 7;
  const nextOrderDate = orderDemand[0]?.nextOrderDate || '-';

  const toggleSelect = (productId: string) => {
    setSelectedItems(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === orderDemand.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(orderDemand.map(item => item.productId));
    }
  };

  const exportOrderList = () => {
    const itemsToExport = selectedItems.length > 0
      ? orderDemand.filter(item => selectedItems.includes(item.productId))
      : orderDemand;

    const sheetData = itemsToExport.map(item => ({
      '商品名称': item.productName,
      '品牌': item.brand,
      '当前库存': item.currentStock,
      '日均销量': item.avgDailySale,
      '周需求量': item.weeklyDemand,
      '建议订货量': item.suggestedOrder,
      '安全库存': item.minStock,
      '最大库存': item.maxStock,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '香烟订货单');
    XLSX.writeFile(wb, `香烟订货单_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
  };

  const selectedTotal = selectedItems.length > 0
    ? orderDemand
        .filter(item => selectedItems.includes(item.productId))
        .reduce((sum, item) => sum + item.suggestedOrder, 0)
    : totalSuggested;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">距下次订货</p>
          <p className="text-2xl font-bold text-gray-800">{daysUntilOrder}天</p>
          <p className="text-xs text-gray-400 mt-1">{nextOrderDate}</p>
        </div>
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <Calendar className="text-blue-600" size={20} />
        </div>
      </div>
    </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">紧急补货</p>
              <p className="text-2xl font-bold text-red-600">{totalUrgent}款</p>
              <p className="text-xs text-gray-400 mt-1">低于安全库存</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">建议订货总量</p>
              <p className="text-2xl font-bold text-primary-600">{totalSuggested}条</p>
              <p className="text-xs text-gray-400 mt-1">基于销售预测</p>
            </div>
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Package className="text-primary-600" size={20} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">香烟SKU数</p>
              <p className="text-2xl font-bold text-gray-800">{orderDemand.length}款</p>
              <p className="text-xs text-gray-400 mt-1">全部在售香烟</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Bell className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">订货提醒</h4>
            <p className="text-sm text-amber-700">
              距离下一次香烟订货还有 <span className="font-bold">{daysUntilOrder}天</span>（{nextOrderDate}），
              请及时核对订货单。香烟受进货配额限制，建议根据历史销量合理规划订货量，
              热销品牌可适当增加订货量，滞销品牌减少订货避免积压资金。
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">订货需求汇总</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              已选 {selectedItems.length} / {orderDemand.length} 项
            </span>
            <button
              onClick={selectAll}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {selectedItems.length === orderDemand.length ? '取消全选' : '全选'}
            </button>
            <button
              onClick={exportOrderList}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              导出订货单
            </button>
          </div>
        </div>

        {urgentItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-red-500" size={18} />
              <h4 className="font-medium text-gray-800">紧急补货（低于安全库存）</h4>
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                {urgentItems.length}款
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-red-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-red-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-red-700 w-10">
                      <input
                        type="checkbox"
                        checked={urgentItems.every(item => selectedItems.includes(item.productId))}
                        onChange={selectAll}
                        className="rounded border-red-300"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-red-700">商品名称</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-red-700">品牌</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-red-700">当前库存</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-red-700">安全库存</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-red-700">日均销量</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-red-700">周需求量</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-red-700">建议订货</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-red-700">库存状态</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentItems.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-b border-gray-50 hover:bg-red-50/50 cursor-pointer"
                      onClick={() => toggleSelect(item.productId)}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.productId)}
                          onChange={() => toggleSelect(item.productId)}
                          className="rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.productName}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{item.brand}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-red-600">{item.currentStock}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.minStock}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.avgDailySale}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.weeklyDemand}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-primary-600">{item.suggestedOrder}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          库存不足
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {normalItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="text-gray-400" size={18} />
              <h4 className="font-medium text-gray-800">常规补货</h4>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {normalItems.length}款
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 w-10">
                      <input
                        type="checkbox"
                        checked={normalItems.every(item => selectedItems.includes(item.productId))}
                        onChange={() => {
                          const normalIds = normalItems.map(i => i.productId);
                          const allSelected = normalIds.every(id => selectedItems.includes(id));
                          if (allSelected) {
                            setSelectedItems(prev => prev.filter(id => !normalIds.includes(id)));
                          } else {
                            setSelectedItems(prev => [...new Set([...prev, ...normalIds])]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">商品名称</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">品牌</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">当前库存</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">安全库存</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">日均销量</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">周需求量</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">建议订货</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">库存状态</th>
                  </tr>
                </thead>
                <tbody>
                  {normalItems.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleSelect(item.productId)}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.productId)}
                          onChange={() => toggleSelect(item.productId)}
                          className="rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.productName}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{item.brand}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.currentStock}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.minStock}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.avgDailySale}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.weeklyDemand}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-primary-600">{item.suggestedOrder}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          库存正常
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">订货汇总：</span>
            {selectedItems.length > 0
              ? `已选 ${selectedItems.length} 款香烟，建议订货 ${selectedTotal} 条`
              : `全部 ${orderDemand.length} 款香烟，建议订货 ${totalSuggested} 条`}
          </div>
          <button
            onClick={exportOrderList}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} />
            导出订货单
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">订货说明</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">1</span>
            </div>
            <p>订货周期为每周一次，通常在每周一提交订货单。</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">2</span>
            </div>
            <p>建议订货量基于近30天日均销量和当前库存计算，确保库存低于安全库存的商品优先补货。</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">3</span>
            </div>
            <p>香烟受进货配额限制，热销品牌可能无法满足全部订货需求，建议提前规划。</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">4</span>
            </div>
            <p>节假日、婚庆旺季可适当增加订货量，提前备货避免断货影响销售。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
