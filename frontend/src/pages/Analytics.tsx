import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Chart } from '@/components/Chart';
import { api } from '@/services/api';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchAnalyticsData } from '@/store/analyticsSlice';

// HUMAN ASSISTANCE NEEDED
// The confidence level for the Analytics component is below 0.8.
// Please review and refine the component implementation.

const Analytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const analyticsData = useAppSelector((state) => state.analytics.data);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsLoading(true);
      await dispatch(fetchAnalyticsData());
      setIsLoading(false);
    };

    loadAnalyticsData();
  }, [dispatch]);

  return (
    <div className="analytics-page">
      <Header />
      <div className="content-wrapper">
        <Sidebar />
        <main className="main-content">
          <h1>Analytics</h1>
          {isLoading ? (
            <p>Loading analytics data...</p>
          ) : (
            <div className="analytics-content">
              {/* Implement analytics visualizations here */}
              <Chart data={analyticsData} />
              {/* Add more charts or tables as needed */}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Analytics;