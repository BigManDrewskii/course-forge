/**
 * Cost Management Dashboard Component
 * Real-time cost tracking, budgets, and usage analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  Calendar,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Clock,
  Wallet
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Cost Metric Card Component
 */
function CostMetricCard({ title, value, change, trend, icon: Icon, className }) {
  const isPositive = trend === 'up';
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                isPositive ? "text-red-600" : "text-green-600"
              )}>
                <TrendIcon className="w-3 h-3" />
                <span>{change}</span>
              </div>
            )}
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Budget Progress Component
 */
function BudgetProgress({ used, budget, period, className }) {
  const percentage = budget > 0 ? (used / budget) * 100 : 0;
  const remaining = Math.max(0, budget - used);
  
  const getStatusColor = () => {
    if (percentage >= 90) return 'text-red-600 bg-red-50 border-red-200';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4" />
          {period} Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Used</span>
          <span className="font-medium">${used.toFixed(2)} / ${budget.toFixed(2)}</span>
        </div>
        
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{percentage.toFixed(1)}% used</span>
            <span>${remaining.toFixed(2)} remaining</span>
          </div>
        </div>

        <div className={cn(
          "p-2 rounded-lg border text-xs text-center",
          getStatusColor()
        )}>
          {percentage >= 90 ? (
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Budget nearly exceeded
            </div>
          ) : percentage >= 75 ? (
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Approaching budget limit
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Within budget
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Provider Usage Chart Component
 */
function ProviderUsageChart({ data, className }) {
  const total = data.reduce((sum, item) => sum + item.cost, 0);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChart className="w-4 h-4" />
          Provider Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((provider, index) => {
          const percentage = total > 0 ? (provider.cost / total) * 100 : 0;
          
          return (
            <div key={provider.name} className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: provider.color }}
                  />
                  <span>{provider.name}</span>
                </div>
                <span className="font-medium">${provider.cost.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Progress value={percentage} className="flex-1 h-1" />
                <span className="text-xs text-gray-500 w-12">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
        
        {data.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No usage data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Recent Transactions Component
 */
function RecentTransactions({ transactions, className }) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((transaction, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-gray-500">
                    {transaction.provider} • {transaction.model}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">${transaction.cost.toFixed(4)}</p>
                <p className="text-xs text-gray-500">{transaction.tokens} tokens</p>
              </div>
            </div>
          ))}
          
          {transactions.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              No recent activity
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Budget Settings Component
 */
function BudgetSettings({ budgets, onUpdateBudget, className }) {
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetValue, setBudgetValue] = useState('');

  const handleEditBudget = (period, currentValue) => {
    setEditingBudget(period);
    setBudgetValue(currentValue.toString());
  };

  const handleSaveBudget = () => {
    const value = parseFloat(budgetValue);
    if (!isNaN(value) && value >= 0) {
      onUpdateBudget(editingBudget, value);
      setEditingBudget(null);
      setBudgetValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingBudget(null);
    setBudgetValue('');
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Budget Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(budgets).map(([period, budget]) => (
          <div key={period} className="space-y-2">
            <Label className="text-sm capitalize">{period} Budget</Label>
            
            {editingBudget === period ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                  min="0"
                  step="0.01"
                />
                <Button size="sm" onClick={handleSaveBudget}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">${budget.toFixed(2)}</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditBudget(period, budget)}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Cost Management Dashboard Component
 */
export function CostManagementDashboard({ className }) {
  const [costData, setCostData] = useState({
    current: {
      today: 0,
      week: 0,
      month: 0
    },
    previous: {
      today: 0,
      week: 0,
      month: 0
    },
    budgets: {
      daily: 10.00,
      weekly: 50.00,
      monthly: 200.00
    },
    providers: [],
    transactions: []
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load cost data
  useEffect(() => {
    loadCostData();
  }, []);

  const loadCostData = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      const response = await fetch('/api/analytics/costs');
      const data = await response.json();
      
      setCostData(data);
    } catch (error) {
      console.error('Failed to load cost data:', error);
      
      // Use mock data for demo
      setCostData({
        current: {
          today: 2.45,
          week: 12.80,
          month: 45.60
        },
        previous: {
          today: 1.80,
          week: 15.20,
          month: 38.90
        },
        budgets: {
          daily: 10.00,
          weekly: 50.00,
          monthly: 200.00
        },
        providers: [
          { name: 'OpenAI', cost: 28.40, color: '#10B981' },
          { name: 'Anthropic', cost: 17.20, color: '#3B82F6' }
        ],
        transactions: [
          {
            description: 'Course Generation',
            provider: 'OpenAI',
            model: 'gpt-4o-mini',
            cost: 0.45,
            tokens: 3200,
            timestamp: new Date()
          },
          {
            description: 'Course Generation',
            provider: 'Anthropic',
            model: 'claude-3-haiku',
            cost: 0.32,
            tokens: 2800,
            timestamp: new Date()
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBudget = async (period, amount) => {
    try {
      await fetch('/api/settings/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period, amount }),
      });

      setCostData(prev => ({
        ...prev,
        budgets: {
          ...prev.budgets,
          [period]: amount
        }
      }));
    } catch (error) {
      console.error('Failed to update budget:', error);
    }
  };

  const calculateChange = (current, previous) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      trend: change >= 0 ? 'up' : 'down'
    };
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const todayChange = calculateChange(costData.current.today, costData.previous.today);
  const weekChange = calculateChange(costData.current.week, costData.previous.week);
  const monthChange = calculateChange(costData.current.month, costData.previous.month);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Management</h2>
          <p className="text-gray-600">Monitor your AI usage costs and manage budgets</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Wallet className="w-3 h-3 mr-1" />
            Real-time tracking
          </Badge>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CostMetricCard
          title="Today"
          value={`$${costData.current.today.toFixed(2)}`}
          change={todayChange?.value}
          trend={todayChange?.trend}
          icon={DollarSign}
        />
        <CostMetricCard
          title="This Week"
          value={`$${costData.current.week.toFixed(2)}`}
          change={weekChange?.value}
          trend={weekChange?.trend}
          icon={Calendar}
        />
        <CostMetricCard
          title="This Month"
          value={`$${costData.current.month.toFixed(2)}`}
          change={monthChange?.value}
          trend={monthChange?.trend}
          icon={BarChart3}
        />
      </div>

      {/* Budget Progress and Provider Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <BudgetProgress
            used={costData.current.daily || costData.current.today}
            budget={costData.budgets.daily}
            period="Daily"
          />
          <BudgetProgress
            used={costData.current.week}
            budget={costData.budgets.weekly}
            period="Weekly"
          />
          <BudgetProgress
            used={costData.current.month}
            budget={costData.budgets.monthly}
            period="Monthly"
          />
        </div>

        <div className="space-y-4">
          <ProviderUsageChart data={costData.providers} />
          <BudgetSettings 
            budgets={costData.budgets}
            onUpdateBudget={handleUpdateBudget}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={costData.transactions} />
    </div>
  );
}

export default CostManagementDashboard;
