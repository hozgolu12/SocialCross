/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { config } from '@/config';

const BACKEND_URL=config.BACKEND_URL
console.log(BACKEND_URL)

const SocialAccounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const platformInfo = {
    twitter: { name: 'Twitter (X)', color: 'bg-blue-500', icon: '𝕏' },
    telegram: { name: 'Telegram', color: 'bg-blue-600', icon: '📱' },
    reddit: { name: 'Reddit', color: 'bg-orange-500', icon: '🔴' },
  };

  // 1. Handle OAuth callback ONLY ONCE on mount
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected) {
      toast({
        title: "Success",
        description: `${connected} account connected successfully!`,
      });
      // Clean the URL BEFORE refreshing user context
      window.history.replaceState({}, '', '/accounts');
    }

    if (error) {
      toast({
        title: "Error",
        description: `Connection failed: ${error.replace(/_/g, ' ')}`,
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/accounts');
    }
    // Only run on mount
    // eslint-disable-next-line
  }, []); // <--- empty dependency array

  // 2. Fetch accounts ONLY when user.socialAccounts changes
  useEffect(() => {
    if (!user) return;
    setAccounts(user.socialAccounts || []);
    setIsLoading(false);
  }, [user?.socialAccounts]);

  const fetchAccounts = async () => {
    if (!token || !user) return;
    
    try {
      console.log('Fetching social accounts...');
      console.log('User object:', user);
      // Use user data from AuthContext
      setAccounts(user.socialAccounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (platform: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Get the correct user ID - check both id and _id properties
    const userId = user.id || (user as any)._id;
    console.log('Connecting with user ID:', userId);
    console.log('Full user object:', user);
    
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Redirect to OAuth endpoint with user ID as query parameter
    window.location.href = `${BACKEND_URL}/api/oauth/${platform}?userId=${userId}`;
  };

  const handleToggle = async (platform: string, isActive: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/social/accounts/${platform}/toggle`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        setAccounts(accounts.map(acc => 
          acc.platform === platform ? { ...acc, isActive } : acc
        ));
        toast({
          title: "Success",
          description: `${platform} account ${isActive ? 'activated' : 'deactivated'}`,
        });
      } else {
        throw new Error('Failed to toggle account');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update account status",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/oauth/disconnect/${platform}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setAccounts(accounts.filter(acc => acc.platform !== platform));
        toast({
          title: "Success",
          description: `${platform} account disconnected`,
        });
        // Refresh user data to update the context
        refreshUser();
      } else {
        throw new Error('Failed to disconnect account');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect account",
        variant: "destructive",
      });
    }
  };


  const activeAccounts = accounts.filter(acc => acc.isActive);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Social Media Accounts</h1>
          
          {/* Active Accounts Summary */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Active Accounts</h2>
            {activeAccounts.length > 0 ? (
              <ul className="list-disc list-inside text-gray-700">
                {activeAccounts.map(acc => (
                  <li key={acc.platform}>
                    {platformInfo[acc.platform]?.name || acc.platform} (@{acc.username})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No active accounts.</p>
            )}
          </div>

          <div className="grid gap-6">
            {Object.entries(platformInfo).map(([platform, info]) => {
              const account = accounts.find(acc => acc.platform === platform);
              
              return (
                <Card key={platform}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${info.color} rounded-full flex items-center justify-center text-white font-bold`}>
                          {info.icon}
                        </div>
                        <div>
                          <CardTitle>{info.name}</CardTitle>
                          <CardDescription>
                            {account ? `Connected as @${account.username}` : 'Not connected'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {account && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Active</span>
                            <Switch
                              checked={account.isActive}
                              onCheckedChange={(checked) => handleToggle(platform, checked)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        {account ? (
                          <div className="text-sm text-gray-600">
                            <p>Connected on {new Date(account.connectedAt).toLocaleDateString()}</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                              account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {account.isActive ? 'Active' : 'Inactive'}
                            </span>
                            </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            Connect your {info.name} account to start cross-posting
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {account ? (
                          <Button
                            variant="outline"
                            onClick={() => handleDisconnect(platform)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button onClick={() => handleConnect(platform)}>
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How to Connect Your Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Twitter (X):</strong> Requires Twitter API v2 access. You'll be redirected to Twitter's OAuth page.</p>
                <p><strong>Telegram:</strong> Connect your Telegram bot to post messages to channels or groups.</p>
                <p><strong>Reddit:</strong> Connect your Reddit account to post to subreddits you moderate or have access to.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SocialAccounts;