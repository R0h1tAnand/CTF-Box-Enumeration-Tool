import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs, TabList, Tab, TabPanel } from '../components/ui/Tabs';
import { LineChart, BarChart } from '../components/ui/Charts';
import { Table } from '../components/ui/Table';
import { useToastHelpers } from '../components/ui/Toast';
import { LoadingAnimation } from '../components/ui/LoadingAnimation';
import { adminService } from '../services/adminService';
import './AdminDashboardPage.css';

export const AdminDashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const { success, error } = useToastHelpers();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const data = await adminService.getDashboardData();
      setDashboardData(data);
      setLoading(false);
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    try {
      await adminService.clearCache();
      success('Success', 'Cache cleared successfully');
      fetchDashboardData();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to clear cache');
    }
  };

  // Reset metrics
  const handleResetMetrics = async () => {
    try {
      await adminService.resetMetrics();
      success('Success', 'Metrics reset successfully');
      fetchDashboardData();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to reset metrics');
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <LoadingAnimation size="large" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="dashboard-actions">
        <Button onClick={fetchDashboardData} variant="secondary">
          Refresh Data
        </Button>
        <Button onClick={handleClearCache} variant="secondary">
          Clear Cache
        </Button>
        <Button onClick={handleResetMetrics} variant="secondary">
          Reset Metrics
        </Button>
        <div className="refresh-interval">
          <label>Auto-refresh:</label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
        </div>
      </div>

      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab id="overview">Overview</Tab>
          <Tab id="performance">Performance</Tab>
          <Tab id="errors">Errors</Tab>
          <Tab id="users">Users</Tab>
          <Tab id="activity">Activity</Tab>
        </TabList>

        <TabPanel id="overview">
          <div className="dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="status-metrics">
                  <div className="metric">
                    <span className="metric-label">CPU Usage</span>
                    <span className="metric-value">
                      {dashboardData?.metrics?.system?.cpu_percent}%
                    </span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${dashboardData?.metrics?.system?.cpu_percent}%`,
                          backgroundColor: getColorForPercentage(
                            dashboardData?.metrics?.system?.cpu_percent
                          ),
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Memory Usage</span>
                    <span className="metric-value">
                      {dashboardData?.metrics?.system?.memory_percent}%
                    </span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${dashboardData?.metrics?.system?.memory_percent}%`,
                          backgroundColor: getColorForPercentage(
                            dashboardData?.metrics?.system?.memory_percent
                          ),
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Disk Usage</span>
                    <span className="metric-value">
                      {dashboardData?.metrics?.system?.disk_usage_percent}%
                    </span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${dashboardData?.metrics?.system?.disk_usage_percent}%`,
                          backgroundColor: getColorForPercentage(
                            dashboardData?.metrics?.system?.disk_usage_percent
                          ),
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Statistics</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.metrics?.requests?.total}
                    </div>
                    <div className="stat-label">Total Requests</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.metrics?.requests?.success}
                    </div>
                    <div className="stat-label">Successful</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.metrics?.requests?.error}
                    </div>
                    <div className="stat-label">Errors</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.metrics?.requests?.avg_time.toFixed(3)}s
                    </div>
                    <div className="stat-label">Avg Response Time</div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Statistics</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.metrics?.database?.queries}
                    </div>
                    <div className="stat-label">Total Queries</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.metrics?.database?.slow_queries}
                    </div>
                    <div className="stat-label">Slow Queries</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.metrics?.database?.avg_query_time.toFixed(3)}s
                    </div>
                    <div className="stat-label">Avg Query Time</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.database?.users}
                    </div>
                    <div className="stat-label">Total Users</div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Statistics</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.cache?.total_items}
                    </div>
                    <div className="stat-label">Total Items</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.cache?.valid_items}
                    </div>
                    <div className="stat-label">Valid Items</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {dashboardData?.cache?.expired_items}
                    </div>
                    <div className="stat-label">Expired Items</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {((dashboardData?.cache?.valid_items / dashboardData?.metrics?.requests?.total) * 100 || 0).toFixed(1)}%
                    </div>
                    <div className="stat-label">Cache Hit Rate</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel id="performance">
          <div className="dashboard-grid">
            <Card className="full-width">
              <CardHeader>
                <CardTitle>Request Response Times</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-container">
                  <LineChart
                    data={{
                      labels: ['Min', 'Average', 'Max'],
                      datasets: [
                        {
                          label: 'Response Time (seconds)',
                          data: [
                            dashboardData?.metrics?.requests?.min_time === Infinity
                              ? 0
                              : dashboardData?.metrics?.requests?.min_time,
                            dashboardData?.metrics?.requests?.avg_time,
                            dashboardData?.metrics?.requests?.max_time,
                          ],
                          borderColor: 'var(--color-primary)',
                          backgroundColor: 'rgba(var(--color-primary-rgb), 0.2)',
                        },
                      ],
                    }}
                    options={{
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Distribution</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-container">
                  <BarChart
                    data={{
                      labels: ['Success', 'Error'],
                      datasets: [
                        {
                          label: 'Requests',
                          data: [
                            dashboardData?.metrics?.requests?.success,
                            dashboardData?.metrics?.requests?.error,
                          ],
                          backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                          ],
                        },
                      ],
                    }}
                    options={{
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-container">
                  <BarChart
                    data={{
                      labels: ['Total Queries', 'Slow Queries'],
                      datasets: [
                        {
                          label: 'Database Queries',
                          data: [
                            dashboardData?.metrics?.database?.queries,
                            dashboardData?.metrics?.database?.slow_queries,
                          ],
                          backgroundColor: [
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 159, 64, 0.6)',
                          ],
                        },
                      ],
                    }}
                    options={{
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel id="errors">
          <div className="dashboard-grid">
            <Card className="full-width">
              <CardHeader>
                <CardTitle>Error Distribution</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-container">
                  <BarChart
                    data={{
                      labels: Object.keys(dashboardData?.errors || {}),
                      datasets: [
                        {
                          label: 'Error Count',
                          data: Object.values(dashboardData?.errors || {}),
                          backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        },
                      ],
                    }}
                    options={{
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </CardBody>
            </Card>

            <Card className="full-width">
              <CardHeader>
                <CardTitle>HTTP Error Codes</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-container">
                  <BarChart
                    data={{
                      labels: Object.keys(dashboardData?.metrics?.errors?.by_code || {}),
                      datasets: [
                        {
                          label: 'Error Count',
                          data: Object.values(dashboardData?.metrics?.errors?.by_code || {}),
                          backgroundColor: 'rgba(255, 159, 64, 0.6)',
                        },
                      ],
                    }}
                    options={{
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel id="users">
          <Card className="full-width">
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">
                    {dashboardData?.database?.users}
                  </div>
                  <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {dashboardData?.database?.active_users}
                  </div>
                  <div className="stat-label">Active Users</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {dashboardData?.database?.users - dashboardData?.database?.active_users}
                  </div>
                  <div className="stat-label">Inactive Users</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="full-width">
            <CardHeader>
              <CardTitle>User List</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => adminService.getUsers().then(setDashboardData)}
              >
                Refresh
              </Button>
            </CardHeader>
            <CardBody>
              <Table
                columns={[
                  { header: 'Username', accessor: 'username' },
                  { header: 'Email', accessor: 'email' },
                  { header: 'Status', accessor: 'is_active', 
                    cell: (row) => (
                      <span className={`status-badge ${row.is_active ? 'active' : 'inactive'}`}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )
                  },
                  { header: 'Created', accessor: 'created_at',
                    cell: (row) => new Date(row.created_at).toLocaleDateString()
                  },
                  { header: 'Last Login', accessor: 'last_login',
                    cell: (row) => row.last_login ? new Date(row.last_login).toLocaleDateString() : 'Never'
                  }
                ]}
                data={dashboardData?.users?.users || []}
                pagination={{
                  totalItems: dashboardData?.users?.pagination?.total || 0,
                  itemsPerPage: dashboardData?.users?.pagination?.per_page || 10,
                  currentPage: dashboardData?.users?.pagination?.page || 1,
                  onPageChange: (page) => {
                    adminService.getUsers(page).then(setDashboardData);
                  }
                }}
              />
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel id="activity">
          <Card className="full-width">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardBody>
              <Table
                columns={[
                  { header: 'User ID', accessor: 'user_id' },
                  { header: 'Activity Type', accessor: 'activity_type' },
                  { header: 'Description', accessor: 'description' },
                  { header: 'IP Address', accessor: 'ip_address' },
                  { header: 'Time', accessor: 'created_at',
                    cell: (row) => new Date(row.created_at).toLocaleString()
                  }
                ]}
                data={dashboardData?.recent_activity || []}
              />
            </CardBody>
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  );
};

// Helper function to get color based on percentage
const getColorForPercentage = (percent: number): string => {
  if (percent < 50) return 'var(--color-success)';
  if (percent < 80) return 'var(--color-warning)';
  return 'var(--color-error)';
};

export default AdminDashboardPage;