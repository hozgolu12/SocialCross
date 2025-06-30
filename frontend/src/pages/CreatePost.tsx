/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Image, Send, Check, Edit } from 'lucide-react';
import { config } from '@/config';

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const platformOptions = [
    { id: 'twitter', label: 'Twitter (X)', color: 'bg-blue-500' },
    { id: 'telegram', label: 'Telegram', color: 'bg-blue-600' },
    { id: 'reddit', label: 'Reddit', color: 'bg-orange-500' },
  ];

  const handlePlatformChange = (platformId: string, checked: boolean) => {
    if (checked) {
      setPlatforms([...platforms, platformId]);
    } else {
      setPlatforms(platforms.filter(p => p !== platformId));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim() || platforms.length === 0) {
      toast({
        title: "Error",
        description: "Please enter content and select at least one platform",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content);

      platforms.forEach(platform => {
        formData.append('platforms[]', platform); // ✅ Proper array form
      });

      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch(`${config.BACKEND_URL}/api/posts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // ❌ DO NOT set 'Content-Type' when using FormData
        },
        body: formData
      });

      const contentType = response.headers.get('Content-Type') || '';
      if (!response.ok) {
        const errorData = contentType.includes('application/json')
          ? await response.json()
          : await response.text();
        throw new Error(errorData.message || errorData || 'Failed to create post');
      }

      const data = await response.json();
      setCurrentPost(data.post);
      setShowPreview(true);

      toast({
        title: "Success",
        description: "Post created with AI adaptations!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveContent = async (platform: string, updatedContent?: string) => {
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/posts/${currentPost._id}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform,
          content: updatedContent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve content');
      }

      const data = await response.json();
      setCurrentPost(data.post);
      setEditingPlatform(null);
      setEditContent('');
      
      toast({
        title: "Success",
        description: "Content approved successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditContent = (platform: string, content: string) => {
    setEditingPlatform(platform);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    handleApproveContent(editingPlatform!, editContent);
  };

  const handlePublish = async () => {
    if (!currentPost) return;

    try {
      const response = await fetch(`${config.BACKEND_URL}/api/posts/${currentPost._id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to publish post');
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Post published to selected platforms!",
      });
      
      navigate('/posts');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (showPreview && currentPost) {
    const hasApprovedContent = currentPost.adaptedContent.some((ac: any) => ac.isApproved);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Preview & Publish</h1>
            
            <div className="grid gap-6">
              {currentPost.adaptedContent.map((adaptation: any) => (
                <Card key={adaptation.platform}>
                  <CardHeader>
                    <CardTitle className="capitalize flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${
                        platformOptions.find(p => p.id === adaptation.platform)?.color
                      }`}></span>
                      {adaptation.platform}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editingPlatform === adaptation.platform ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={6}
                          className="resize-none"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Check size={16} className="mr-2" />
                            Save & Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingPlatform(null);
                              setEditContent('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <p className="whitespace-pre-wrap">{adaptation.content}</p>
                          {adaptation.hashtags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {adaptation.hashtags.map((tag: string, index: number) => (
                                <span key={index} className="text-blue-600 text-sm">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            adaptation.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {adaptation.isApproved ? 'Approved' : 'Pending Review'}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditContent(adaptation.platform, adaptation.content)}
                            >
                              <Edit size={16} className="mr-2" />
                              Edit Content
                            </Button>
                            {!adaptation.isApproved && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveContent(adaptation.platform)}
                              >
                                <Check size={16} className="mr-2" />
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Back to Edit
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!hasApprovedContent}
                className="flex items-center"
              >
                <Send size={16} className="mr-2" />
                Publish to Approved Platforms
              </Button>
            </div>
            
            {!hasApprovedContent && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Please approve at least one platform's content before publishing
              </p>
            )}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Post Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="What would you like to share?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Images/Videos (optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                      >
                        <Image size={16} className="mr-2" />
                        Choose Files
                      </label>
                      {images.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {images.length} file(s) selected
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Select Platforms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {platformOptions.map((platform) => (
                      <div key={platform.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform.id}
                          checked={platforms.includes(platform.id)}
                          onCheckedChange={(checked) => 
                            handlePlatformChange(platform.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={platform.id}
                          className="flex items-center text-sm font-medium cursor-pointer"
                        >
                          <span className={`w-3 h-3 rounded-full mr-2 ${platform.color}`}></span>
                          {platform.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleCreatePost}
                    disabled={isLoading || !content.trim() || platforms.length === 0}
                    className="w-full mt-6"
                  >
                    {isLoading ? 'Creating...' : 'Create & Preview'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;