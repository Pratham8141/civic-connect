import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { api, Grievance } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, User, Building, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.type !== 'admin') {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    municipality: user?.municipality || 'all'
  });

  // Fetch grievances for admin
  const { data: grievancesData, isLoading: grievancesLoading } = useQuery({
    queryKey: ['/api/grievances', { ...filters, sortBy: 'urgent' }],
    queryFn: () => api.getGrievances({ ...filters, sortBy: 'urgent' }),
  });

  // Fetch analytics
  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/stats', user?.municipality],
    queryFn: () => api.getGrievanceStats(user?.municipality),
  });

  // Update grievance status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      api.updateGrievance(id, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grievances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
      toast({
        title: "Success",
        description: "Grievance status updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (grievanceId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: grievanceId, status: newStatus });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'urgent': return 'destructive';
      case 'in-progress': return 'default';
      case 'resolved': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityScore = (grievance: Grievance) => {
    const baseScore = grievance.upvotes - grievance.downvotes;
    const urgentMultiplier = grievance.status === 'urgent' ? 2 : 1;
    const ageHours = (new Date().getTime() - new Date(grievance.timestamp).getTime()) / (1000 * 60 * 60);
    const agePenalty = Math.floor(ageHours / 24) * 0.1; // Small penalty for older issues
    
    return Math.max(0, (baseScore * urgentMultiplier) - agePenalty);
  };

  if (!user || user.type !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome, {user.username} • {user.department} Department
            </p>
          </div>
          <Button variant="outline" onClick={logout} data-testid="button-admin-logout">
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="grievances" data-testid="tab-grievances">Manage Grievances</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Grievances</p>
                      <p className="text-2xl font-bold">{stats?.total || 0}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Urgent</p>
                      <p className="text-2xl font-bold text-red-600">{stats?.urgent || 0}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                      <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* High Priority Issues */}
            <Card>
              <CardHeader>
                <CardTitle>High Priority Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {grievancesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {grievancesData?.grievances
                      ?.sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
                      ?.slice(0, 5)
                      ?.map((grievance) => (
                        <div key={grievance.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getStatusBadgeVariant(grievance.status)}>
                                {grievance.status}
                              </Badge>
                              <Badge variant="outline">{grievance.category}</Badge>
                              <span className="text-sm text-muted-foreground">
                                Priority: {getPriorityScore(grievance).toFixed(1)}
                              </span>
                            </div>
                            <h4 className="font-medium">{grievance.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {grievance.description.substring(0, 100)}...
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {grievance.authorUsername}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {getTimeAgo(grievance.timestamp)}
                              </span>
                              {grievance.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {grievance.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <Select
                              value={grievance.status}
                              onValueChange={(value) => handleStatusChange(grievance.id, value)}
                            >
                              <SelectTrigger className="w-40" data-testid={`select-status-${grievance.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grievances" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Grievances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger data-testid="select-filter-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select 
                      value={filters.category} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger data-testid="select-filter-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="sanitation">Sanitation</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="environment">Environment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Municipality</label>
                    <Select 
                      value={filters.municipality} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, municipality: value }))}
                    >
                      <SelectTrigger data-testid="select-filter-municipality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Municipalities</SelectItem>
                        <SelectItem value="mumbai">Mumbai</SelectItem>
                        <SelectItem value="delhi">Delhi</SelectItem>
                        <SelectItem value="bangalore">Bangalore</SelectItem>
                        <SelectItem value="pune">Pune</SelectItem>
                        <SelectItem value="hyderabad">Hyderabad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grievances List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  All Grievances ({grievancesData?.total || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {grievancesLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse space-y-3 p-4 border rounded-lg">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                ) : grievancesData?.grievances?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No grievances found with current filters.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {grievancesData?.grievances?.map((grievance) => (
                      <Card key={grievance.id} data-testid={`admin-grievance-${grievance.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {grievance.authorUsername.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{grievance.authorUsername}</p>
                                <p className="text-sm text-muted-foreground">
                                  {getTimeAgo(grievance.timestamp)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{grievance.category}</Badge>
                              <Badge variant="outline">{grievance.municipality}</Badge>
                              <Badge variant={getStatusBadgeVariant(grievance.status)}>
                                {grievance.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold">{grievance.title}</h3>
                            <p className="text-muted-foreground">{grievance.description}</p>
                            {grievance.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {grievance.location}
                              </p>
                            )}
                          </div>

                          <Separator className="my-4" />

                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Votes: {grievance.upvotes - grievance.downvotes} | 
                              Priority Score: {getPriorityScore(grievance).toFixed(1)}
                            </div>
                            <Select
                              value={grievance.status}
                              onValueChange={(value) => handleStatusChange(grievance.id, value)}
                            >
                              <SelectTrigger className="w-40" data-testid={`select-grievance-status-${grievance.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full">
                          <div 
                            className="h-2 bg-orange-500 rounded-full" 
                            style={{ width: `${stats?.total ? (stats.pending / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats?.pending || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Urgent</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full">
                          <div 
                            className="h-2 bg-red-500 rounded-full" 
                            style={{ width: `${stats?.total ? (stats.urgent / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats?.urgent || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">In Progress</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${stats?.total ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats?.inProgress || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Resolved</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${stats?.total ? (stats.resolved / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats?.resolved || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Department Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{user.department}</div>
                      <p className="text-sm text-muted-foreground">Your Department</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-semibold text-green-600">
                          {stats?.resolved || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Resolved</p>
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-orange-600">
                          {(stats?.pending || 0) + (stats?.urgent || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}