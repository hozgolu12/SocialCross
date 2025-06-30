/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, FileText, Settings } from 'lucide-react';
import { config } from '@/config';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    totalPosts: 0,
    connectedAccounts: 0,
    recentPosts: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
   if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
       setIsLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data...');
      
      // Fetch posts
      const postsResponse = await fetch(`${config.BACKEND_URL}/api/posts`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let postsData = { posts: [] };
      if (postsResponse.ok) {
        const contentType = postsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          postsData = await postsResponse.json();
          console.log('Posts data:', postsData);
        } else {
          console.warn('Posts API returned non-JSON response');
        }
      } else {
        console.error('Posts API error:', postsResponse.status, await postsResponse.text());
      }
      const connectedAccounts = user?.socialAccounts?.filter(acc => acc.isActive).length || 0;
      
      setStats({
        totalPosts: postsData.posts?.length || 0,
        connectedAccounts,
        recentPosts: postsData.posts?.slice(0, 5) || []
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
       setError(error.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your social media presence from one place</p>
          </div>

           {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">Error: {error}</p>
              <Button 
                onClick={fetchDashboardData} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}


          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Link to="/create">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Plus className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-semibold">Create Post</h3>
                    <p className="text-sm text-gray-600">New content</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/accounts">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Settings className="h-8 w-8 text-green-600 mr-4" />
                  <div>
                    <h3 className="font-semibold">Social Accounts</h3>
                    <p className="text-sm text-gray-600">{stats.connectedAccounts} connected</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/posts">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <FileText className="h-8 w-8 text-purple-600 mr-4" />
                  <div>
                    <h3 className="font-semibold">All Posts</h3>
                    <p className="text-sm text-gray-600">{stats.totalPosts} total</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="flex items-center p-6">
                <Users className="h-8 w-8 text-orange-600 mr-4" />
                <div>
                  <h3 className="font-semibold">Reach</h3>
                  <p className="text-sm text-gray-600">Coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>Your latest social media posts</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentPosts.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentPosts.map((post: any) => (
                      <div key={post._id} className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm font-medium">{post.originalContent.substring(0, 100)}...</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(post.createdAt).toLocaleDateString()} • {post.status}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No posts yet</p>
                    <Link to="/create">
                      <Button className="mt-4">Create your first post</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Your linked social media accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {user?.socialAccounts && user.socialAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {user.socialAccounts.map((account) => (
                      <div key={account.platform} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-bold text-blue-600">
                              {account.platform.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium capitalize">{account.platform}</p>
                            <p className="text-sm text-gray-500">@{account.username}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No accounts connected</p>
                    <Link to="/accounts">
                      <Button className="mt-4">Connect accounts</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
