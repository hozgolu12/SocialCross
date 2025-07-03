/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { config } from '@/config';
import { useToast } from '@/hooks/use-toast';

const Posts = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const {toast} = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/posts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (postId: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${config.BACKEND_URL}/api/posts/retry`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.message || 'Retry failed');
      }
      toast({
        title: "Success",
        description: data.message || "Post published successfully!"
      });
      await fetchPosts(); // Refresh the posts list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish post.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        toast({
          title: 'Post deleted successfully from database',
          description: 'The post has been deleted.',
        })
        await fetchPosts(); // refresh the posts list
      } else {
        toast({
          title: 'Post not deleted',
          variant: 'destructive'
        })
      }
    } 
    catch (err) {
      toast({
        title: 'error',
        description: err,
        variant: 'destructive'
      })
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter': return 'bg-blue-100 text-blue-800';
      case 'telegram': return 'bg-blue-100 text-blue-600';
      case 'reddit': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
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
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Posts</h1>
            <Button onClick={() => window.location.href = '/create'}>
              Create New Post
            </Button>
          </div>
          
          {posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">No posts created yet</p>
                <Button onClick={() => window.location.href = '/create'}>
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {post.originalContent.substring(0, 100)}
                          {post.originalContent.length > 100 && '...'}
                        </CardTitle>
                        <CardDescription>
                          Created on {new Date(post.createdAt).toLocaleDateString()} at{' '}
                          {new Date(post.createdAt).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Platform Adaptations */}
                      <div>
                        <h4 className="font-medium mb-2">Platform Adaptations:</h4>
                        <div className="grid gap-3">
                          {post.adaptedContent.map((adaptation: any) => (
                            <div key={adaptation.platform} className="border rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <Badge className={getPlatformColor(adaptation.platform)}>
                                  {adaptation.platform}
                                </Badge>
                                <Badge variant={adaptation.publishStatus === 'published' ? 'default' : 'secondary'}>
                                  {adaptation.publishStatus}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {adaptation.content.substring(0, 150)}
                                {adaptation.content.length > 150 && '...'}
                              </p>
                              {adaptation.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {adaptation.hashtags.slice(0, 3).map((tag: string, index: number) => (
                                    <span key={index} className="text-xs text-blue-600">
                                      #{tag}
                                    </span>
                                  ))}
                                  {adaptation.hashtags.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{adaptation.hashtags.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                              {adaptation.publishedAt && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Published: {new Date(adaptation.publishedAt).toLocaleString()}
                                </p>
                              )}
                              {adaptation.errorMessage && (
                                <p className="text-xs text-red-600 mt-2">
                                  Error: {adaptation.errorMessage}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Images */}
                      {post.images && post.images.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Images:</h4>
                          <div className="flex space-x-2">
                            {post.images.slice(0, 3).map((image: string, index: number) => (
                              <div key={index} className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">IMG</span>
                              </div>
                            ))}
                            {post.images.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">+{post.images.length - 3}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="text-sm text-gray-500">
                          Platforms: {
                                Array.isArray(post.targetPlatforms) && post.targetPlatforms.length > 0
                                  ? post.targetPlatforms.join(', ')
                                  : Array.isArray(post.adaptedContent)
                                    ? post.adaptedContent.map((a: any) => a.platform).join(', ')
                                    : 'No platforms'
                          }

                        </div>
                        <div className="space-x-2">
                          {post.status === 'draft' && (
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                          )}
                          {post.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetry(post._id)}
                            >
                              Retry
                            </Button>
                          )}
                          {(
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDelete(post._id)}
                              >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Posts;
