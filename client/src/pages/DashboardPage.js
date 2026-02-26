import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { statsAPI } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await statsAPI.getStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!stats) {
    return <div className="empty-state"><p>لا توجد بيانات</p></div>;
  }

  // بيانات الرسم البياني - النقاط الشهرية
  const lineChartData = {
    labels: stats.monthlyPoints.map(m => m.month),
    datasets: [
      {
        label: 'نقاط مكتسبة',
        data: stats.monthlyPoints.map(m => m.earned),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'نقاط مستبدلة',
        data: stats.monthlyPoints.map(m => m.redeemed),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // بيانات الدونات - العملاء حسب المستوى
  const doughnutData = {
    labels: stats.customersByTier.map(t => t.name),
    datasets: [
      {
        data: stats.customersByTier.map(t => t.count),
        backgroundColor: stats.customersByTier.map(t => t.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ar-SA').format(num);
  };

  return (
    <div>
      <div className="page-header">
        <h1>لوحة التحكم</h1>
        <p>نظرة عامة على برنامج نقاط الولاء</p>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <span style={{ fontSize: '24px' }}>👥</span>
          </div>
          <div className="stat-info">
            <h4>إجمالي العملاء</h4>
            <div className="stat-value">{formatNumber(stats.totalCustomers)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <span style={{ fontSize: '24px' }}>⭐</span>
          </div>
          <div className="stat-info">
            <h4>النقاط الممنوحة</h4>
            <div className="stat-value">{formatNumber(stats.totalPointsIssued)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <span style={{ fontSize: '24px' }}>🔄</span>
          </div>
          <div className="stat-info">
            <h4>النقاط المستبدلة</h4>
            <div className="stat-value">{formatNumber(stats.totalPointsRedeemed)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <span style={{ fontSize: '24px' }}>🎟️</span>
          </div>
          <div className="stat-info">
            <h4>كوبونات نشطة</h4>
            <div className="stat-value">{formatNumber(stats.activeCoupons)}</div>
          </div>
        </div>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header">
            <h3>📈 النقاط الشهرية</h3>
          </div>
          <div className="card-body">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { font: { family: 'Tajawal' } } },
                  x: { ticks: { font: { family: 'Tajawal' } } },
                },
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🏆 العملاء حسب المستوى</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {stats.customersByTier.length > 0 ? (
              <div style={{ maxWidth: '280px' }}>
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="empty-state"><p>لا توجد بيانات</p></div>
            )}
          </div>
        </div>
      </div>

      {/* آخر المعاملات */}
      <div className="card">
        <div className="card-header">
          <h3>📋 آخر المعاملات</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>العميل</th>
                <th>النوع</th>
                <th>النقاط</th>
                <th>الوصف</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.customer?.name || '-'}</td>
                  <td>
                    <span className={`badge ${getTypeBadge(tx.type)}`}>
                      {getTypeLabel(tx.type)}
                    </span>
                  </td>
                  <td>
                    <span className={`points-amount ${tx.points > 0 ? 'positive' : 'negative'}`}>
                      {tx.points > 0 ? '+' : ''}{formatNumber(tx.points)}
                    </span>
                  </td>
                  <td>{tx.description}</td>
                  <td>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getTypeLabel(type) {
  const labels = {
    EARN_PURCHASE: 'شراء',
    EARN_SIGNUP: 'تسجيل',
    EARN_REFERRAL: 'إحالة',
    EARN_BONUS: 'مكافأة',
    REDEEM_COUPON: 'استبدال',
    DEDUCT_MANUAL: 'خصم',
    EXPIRED: 'منتهي',
  };
  return labels[type] || type;
}

function getTypeBadge(type) {
  if (type.startsWith('EARN')) return 'badge-success';
  if (type === 'REDEEM_COUPON') return 'badge-warning';
  if (type === 'DEDUCT_MANUAL') return 'badge-danger';
  if (type === 'EXPIRED') return 'badge-info';
  return 'badge-primary';
}

export default DashboardPage;
