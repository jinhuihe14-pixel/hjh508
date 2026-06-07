import { useMemo, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  Download,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getCigaretteOrderDemand } from '@/utils/analytics';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { CigaretteOrderRecord, CigaretteOrderItem } from '@/types';

export default function CigaretteOrder() {
  const { products, saleOrders, purchaseOrders, cigaretteOrders, addCigaretteOrder, confirmCigaretteOrderReceived } = useData();
  const [activeTab, setActiveTab] = useState<'demand' | 'records'>('demand');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CigaretteOrderRecord | null>(null);

  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});

  const orderDemand = useMemo(() => {
    return getCigaretteOrderDemand(saleOrders, purchaseOrders);
  }, [saleOrders, purchaseOrders]);

  const cigaretteProducts = useMemo(() => {
    return products.filter(p => p.category === '香烟');
  }, [products]);

  const historicalArrivalRate = useMemo(() => {
    const rateMap = new Map<string, { totalOrder: number; totalReceived: number; count: number }>();

    cigaretteOrders
      .filter(o => o.status === 'received')
      .slice(0, 5)
      .forEach(order => {
        order.items.forEach(item => {
          const existing = rateMap.get(item.productId) || { totalOrder: 0, totalReceived: 0, count: 0 };
          rateMap.set(item.productId, {
            totalOrder: existing.totalOrder + item.orderQuantity,
            totalReceived: existing.totalReceived + (item.receivedQuantity || 0),
            count: existing.count + 1,
          });
        });
      });

    const result = new Map<string, number>();
    rateMap.forEach((value, key) => {
      const rate = value.totalOrder > 0
        ? Math.round((value.totalReceived / value.totalOrder) * 10000) / 100
        : 0;
      result.set(key, rate);
    });

    return result;
  }, [cigaretteOrders]);

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

  const handleOpenCreateModal = () => {
    const initialQuantities: Record<string, number> = {};
    orderDemand.forEach(item => {
      initialQuantities[item.productId] = item.suggestedOrder;
    });
    setOrderQuantities(initialQuantities);
    setShowCreateModal(true);
  };

  const handleCreateOrder = () => {
    const items: CigaretteOrderItem[] = cigaretteProducts
      .filter(p => (orderQuantities[p.id] || 0) > 0)
      .map(p => ({
        productId: p.id,
        productName: p.name,
        brand: p.brand,
        orderQuantity: orderQuantities[p.id] || 0,
        receivedQuantity: null,
        unitPrice: p.costPrice,
      }));

    if (items.length === 0) {
      alert('请至少输入一个品种的订货数量');
      return;
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.orderQuantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.orderQuantity * item.unitPrice, 0);

    const today = dayjs().format('YYYY-MM-DD');
    const orderNo = `XYD${today.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const newOrder: CigaretteOrderRecord = {
      id: `cig-${Date.now()}`,
      orderNo,
      orderDate: today,
      receiveDate: null,
      status: 'pending',
      items,
      totalOrderQuantity: totalQuantity,
      totalReceivedQuantity: null,
      totalAmount: Math.round(totalAmount),
      arrivalRate: null,
    };

    addCigaretteOrder(newOrder);
    setShowCreateModal(false);
    setActiveTab('records');
  };

  const handleOpenReceiveModal = (order: CigaretteOrderRecord) => {
    const initialQuantities: Record<string, number> = {};
    order.items.forEach(item => {
      initialQuantities[item.productId] = item.orderQuantity;
    });
    setReceiveQuantities(initialQuantities);
    setSelectedOrder(order);
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = () => {
    if (!selectedOrder) return;

    const today = dayjs().format('YYYY-MM-DD');
    const receivedItems = selectedOrder.items.map(item => ({
      productId: item.productId,
      receivedQuantity: receiveQuantities[item.productId] || 0,
    }));

    confirmCigaretteOrderReceived(selectedOrder.id, today, receivedItems);
    setShowReceiveModal(false);
    setSelectedOrder(null);
  };

  const orderTotalQuantity = useMemo(() => {
    return Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [orderQuantities]);

  const orderTotalAmount = useMemo(() => {
    return cigaretteProducts.reduce((sum, p) => {
      return sum + (orderQuantities[p.id] || 0) * p.costPrice;
    }, 0);
  }, [orderQuantities, cigaretteProducts]);

  const receiveTotalQuantity = useMemo(() => {
    return Object.values(receiveQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [receiveQuantities]);

  const getArrivalRateStatus = (rate: number | null | undefined) => {
    if (rate === null || rate === undefined) return { label: '暂无数据', color: 'text-gray-500 bg-gray-100' };
    if (rate < 70) return { label: '供应紧张', color: 'text-red-600 bg-red-50' };
    if (rate < 90) return { label: '供应一般', color: 'text-amber-600 bg-amber-50' };
    return { label: '供应正常', color: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex bg-white rounded-lg p-1 shadow-sm">
          {[
            { key: 'demand', label: '订货需求', icon: Package },
            { key: 'records', label: '订货记录', icon: FileText },
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
        {activeTab === 'records' && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            创建订货单
          </button>
        )}
      </div>

      {activeTab === 'demand' && (
        <>
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
                        <th className="text-left py-3 px-4 text-sm font-medium text-red-700">历史到货率</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-red-700">库存状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {urgentItems.map((item) => {
                        const rate = historicalArrivalRate.get(item.productId);
                        const rateStatus = getArrivalRateStatus(rate);
                        return (
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
                              {rate !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${rate < 70 ? 'text-red-600' : rate < 90 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {rate}%
                                  </span>
                                  {rate < 70 && <TrendingDown size={14} className="text-red-500" />}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">暂无数据</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                库存不足
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
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">历史到货率</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">库存状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalItems.map((item) => {
                        const rate = historicalArrivalRate.get(item.productId);
                        return (
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
                              {rate !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${rate < 70 ? 'text-red-600' : rate < 90 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {rate}%
                                  </span>
                                  {rate < 70 && <TrendingDown size={14} className="text-red-500" />}
                                  {rate >= 90 && <TrendingUp size={14} className="text-green-500" />}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">暂无数据</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                库存正常
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

            <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">订货汇总：</span>
                {selectedItems.length > 0
                  ? `已选 ${selectedItems.length} 款香烟，建议订货 ${selectedTotal} 条`
                  : `全部 ${orderDemand.length} 款香烟，建议订货 ${totalSuggested} 条`}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenCreateModal}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  创建订货单
                </button>
                <button
                  onClick={exportOrderList}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Download size={18} />
                  导出订货单
                </button>
              </div>
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
                <p>香烟受进货配额限制，热销品牌可能无法满足全部订货需求，建议提前规划。可参考历史到货率调整订货策略。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">4</span>
                </div>
                <p>节假日、婚庆旺季可适当增加订货量，提前备货避免断货影响销售。</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'records' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">订货记录</h3>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              创建订货单
            </button>
          </div>

          {cigaretteOrders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500 mb-4">暂无订货记录</p>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                创建第一条订货单
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cigaretteOrders.map((order) => (
                <div key={order.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-800">{order.orderNo}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          order.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {order.status === 'pending' ? '待到货' : '已到货'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {order.items.length} 个品种
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800">订货: {order.totalOrderQuantity} 条</p>
                          {order.totalReceivedQuantity !== null && (
                            <p className="text-xs text-gray-500">到货: {order.totalReceivedQuantity} 条</p>
                          )}
                        </div>
                        {order.arrivalRate !== null && (
                          <div className="text-right min-w-[80px]">
                            <p className={`text-sm font-bold ${
                              order.arrivalRate < 70 ? 'text-red-600' : order.arrivalRate < 90 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                              {order.arrivalRate}%
                            </p>
                            <p className="text-xs text-gray-500">到货率</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{order.orderDate}</p>
                          {order.receiveDate && (
                            <p className="text-xs text-gray-400">到货: {order.receiveDate}</p>
                          )}
                        </div>
                        <div className="text-gray-400">
                          {expandedOrderId === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedOrderId === order.id && (
                    <div className="p-4 border-t border-gray-100">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">商品名称</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">品牌</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">订货数量</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">到货数量</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">到货率</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">单价</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => {
                              const itemRate = item.orderQuantity > 0 && item.receivedQuantity !== null
                                ? Math.round((item.receivedQuantity / item.orderQuantity) * 10000) / 100
                                : null;
                              return (
                                <tr key={item.productId} className="border-b border-gray-50 last:border-b-0">
                                  <td className="py-3 px-3 text-sm font-medium text-gray-800">{item.productName}</td>
                                  <td className="py-3 px-3 text-sm text-gray-500">{item.brand}</td>
                                  <td className="py-3 px-3 text-sm text-right text-gray-800">{item.orderQuantity} 条</td>
                                  <td className="py-3 px-3 text-sm text-right text-gray-800">
                                    {item.receivedQuantity !== null ? `${item.receivedQuantity} 条` : '-'}
                                  </td>
                                  <td className="py-3 px-3 text-sm text-right">
                                    {itemRate !== null ? (
                                      <span className={`font-medium ${
                                        itemRate < 70 ? 'text-red-600' : itemRate < 90 ? 'text-amber-600' : 'text-green-600'
                                      }`}>
                                        {itemRate}%
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-sm text-right text-gray-600">¥{item.unitPrice}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">订货总金额：</span>
                          <span className="font-bold text-primary-600">¥{order.totalAmount.toLocaleString()}</span>
                        </div>
                        {order.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReceiveModal(order);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <CheckCircle size={16} />
                            确认到货
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">创建订货单</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">商品名称</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">品牌</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">当前库存</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">建议订货</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">订货数量(条)</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">单价</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">历史到货率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cigaretteProducts.map((product) => {
                      const demand = orderDemand.find(d => d.productId === product.id);
                      const rate = historicalArrivalRate.get(product.id);
                      return (
                        <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">{product.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">{product.brand}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600">{demand?.currentStock || 0}</td>
                          <td className="py-3 px-4 text-sm text-right font-medium text-primary-600">{demand?.suggestedOrder || 0}</td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              value={orderQuantities[product.id] || 0}
                              onChange={(e) => setOrderQuantities(prev => ({
                                ...prev,
                                [product.id]: Math.max(0, parseInt(e.target.value) || 0),
                              }))}
                              className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600">¥{product.costPrice}</td>
                          <td className="py-3 px-4">
                            {rate !== undefined ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className={`text-sm font-medium ${rate < 70 ? 'text-red-600' : rate < 90 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {rate}%
                                </span>
                                {rate < 70 && <TrendingDown size={12} className="text-red-500" />}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">暂无</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">合计：</span>
                  <span className="mx-2">{orderTotalQuantity} 条</span>
                  <span className="text-gray-400">|</span>
                  <span className="mx-2">预估金额 ¥{Math.round(orderTotalAmount).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    确认创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">确认到货</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedOrder.orderNo}</p>
              </div>
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">商品名称</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">订货数量</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">实际到货(条)</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">差异</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => {
                      const received = receiveQuantities[item.productId] || 0;
                      const diff = received - item.orderQuantity;
                      return (
                        <tr key={item.productId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.productName}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600">{item.orderQuantity} 条</td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              value={received}
                              onChange={(e) => setReceiveQuantities(prev => ({
                                ...prev,
                                [item.productId]: Math.max(0, parseInt(e.target.value) || 0),
                              }))}
                              className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            <span className={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-400'}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">订货总数：</span>
                  <span className="mx-2">{selectedOrder.totalOrderQuantity} 条</span>
                  <span className="text-gray-400">|</span>
                  <span className="mx-2">
                    实际到货：<span className="font-medium text-primary-600">{receiveTotalQuantity} 条</span>
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="mx-2">
                    到货率：
                    <span className={`font-bold ${
                      selectedOrder.totalOrderQuantity > 0 && (receiveTotalQuantity / selectedOrder.totalOrderQuantity) < 0.7
                        ? 'text-red-600'
                        : selectedOrder.totalOrderQuantity > 0 && (receiveTotalQuantity / selectedOrder.totalOrderQuantity) < 0.9
                          ? 'text-amber-600'
                          : 'text-green-600'
                    }`}>
                      {selectedOrder.totalOrderQuantity > 0
                        ? Math.round((receiveTotalQuantity / selectedOrder.totalOrderQuantity) * 10000) / 100
                        : 0}%
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowReceiveModal(false);
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmReceive}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    确认到货
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
