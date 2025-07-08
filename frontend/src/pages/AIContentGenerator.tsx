/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Upload, Sparkles, Copy, RefreshCw, Send } from 'lucide-react';
import { config } from '@/config';

interface GeneratedPost {
  content: string;
  metadata: {
    brandName: string;
    purpose: string;
    targetAudience: string;
    tone: string;
    platform: string;
    colors: string[];
  };
}

interface BrandData {
  brand_name: string;
  colors: string[];
  dominant_color: string;
}

const AIContentGenerator = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [purpose, setPurpose] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  
  // Generation state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [editedContent, setEditedContent] = useState('');

  const platformOptions = [
    { id: 'twitter', label: 'Twitter (X)', color: '#1DA1F2' },
    { id: 'telegram', label: 'Telegram', color: '#0088CC' },
    { id: 'reddit', label: 'Reddit', color: '#FF4500' },
  ];

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'fun', label: 'Fun & Casual' },
    { value: 'trendy', label: 'Trendy & Modern' },
    { value: 'friendly', label: 'Friendly & Approachable' },
    { value: 'authoritative', label: 'Authoritative' },
  ];

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze logo
    await analyzeLogo(file);
  };

  const analyzeLogo = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${config.BACKEND_URL}/api/ai-content/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to analyze logo');
      }

      const result = await response.json();
      setBrandData(result.data);

      if (result.fallback) {
        toast({
          title: "Analysis Complete",
          description: "Logo analyzed with fallback data (Python service unavailable)",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "Brand information extracted from your logo!",
        });
      }

    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlatformChange = (platformId: string, checked: boolean) => {
    if (checked) {
      setPlatforms([...platforms, platformId]);
    } else {
      setPlatforms(platforms.filter(p => p !== platformId));
    }
  };

  const generatePost = async () => {
    if (!purpose.trim() || !targetAudience.trim() || !tone || platforms.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select at least one platform",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/ai-content/generate-post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandName: brandData?.brand_name || 'Your Brand',
          purpose,
          targetAudience,
          tone,
          platform: platforms,
          colors: brandData?.colors || ['#3B82F6', '#10B981', '#F59E0B']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const result = await response.json();
      setGeneratedPost(result);
      setEditedContent(result.content);

      toast({
        title: "Content Generated!",
        description: "Your AI-powered social media post is ready",
      });

    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regeneratePost = async () => {
    if (!generatedPost) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/ai-content/regenerate-post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metadata: generatedPost.metadata
        })
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate content');
      }

      const result = await response.json();
      setGeneratedPost(result);
      setEditedContent(result.content);

      toast({
        title: "Content Regenerated!",
        description: "Here's a fresh take on your post",
      });

    } catch (error: any) {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      toast({
        title: "Copied!",
        description: "Post content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const mockPost = () => {
    toast({
      title: "Posted!",
      description: "Your content would be posted to the selected platforms",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Sparkles className="mr-3 text-purple-600" />
              AI Content Generator For Business
            </h1>
            <p className="mt-2 text-gray-600">
              Upload your brand logo and let AI create engaging social media content
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="space-y-6">
              {/* Logo Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>Brand Logo</CardTitle>
                  <CardDescription>
                    Upload your logo to extract brand colors and text
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview ? (
                        <div className="space-y-2">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="max-h-32 mx-auto rounded"
                          />
                          <p className="text-sm text-gray-600">Click to change logo</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="text-gray-600">Click to upload your logo</p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {isAnalyzing && (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        <span className="text-sm text-gray-600">Analyzing logo...</span>
                      </div>
                    )}
                    {brandData && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Extracted Information:</h4>
                        <p className="text-sm"><strong>Brand:</strong> {brandData.brand_name}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-sm"><strong>Colors:</strong></span>
                          {brandData.colors.map((color, index) => (
                            <div
                              key={index}
                              className="w-6 h-6 rounded-full border-2 border-white shadow"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Content Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Details</CardTitle>
                  <CardDescription>
                    Tell us about your post requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="purpose">Purpose of Post *</Label>
                    <Textarea
                      id="purpose"
                      placeholder="e.g., Promote our new product launch, increase brand awareness, drive website traffic..."
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="audience">Target Audience *</Label>
                    <Input
                      id="audience"
                      placeholder="e.g., Young professionals, tech enthusiasts, small business owners..."
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tone">Tone *</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {toneOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Platforms *</Label>
                    <div className="space-y-2 mt-2">
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
                            <span
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: platform.color }}
                            ></span>
                            {platform.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={generatePost}
                    disabled={isGenerating || !purpose.trim() || !targetAudience.trim() || !tone || platforms.length === 0}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate AI Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>
                    Preview and edit your AI-generated post
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedPost ? (
                    <div className="space-y-4">
                      {/* Brand Colors Preview */}
                      {brandData && (
                        <div 
                          className="p-4 rounded-lg border-l-4"
                          style={{ 
                            borderLeftColor: brandData.dominant_color,
                            backgroundColor: `${brandData.dominant_color}10`
                          }}
                        >
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            {brandData.brand_name} Brand Post
                          </h4>
                          <div className="flex space-x-1">
                            {brandData.colors.map((color, index) => (
                              <div
                                key={index}
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Editor */}
                      <div>
                        <Label htmlFor="content">Post Content</Label>
                        <Textarea
                          id="content"
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={8}
                          className="mt-1"
                        />
                      </div>

                      {/* Platform Tags */}
                      <div className="flex flex-wrap gap-2">
                        {platforms.map((platformId) => {
                          const platform = platformOptions.find(p => p.id === platformId);
                          return platform ? (
                            <span
                              key={platformId}
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: platform.color }}
                            >
                              {platform.label}
                            </span>
                          ) : null;
                        })}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button
                          onClick={regeneratePost}
                          disabled={isGenerating}
                          variant="outline"
                          className="flex-1"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Regenerate
                        </Button>
                        <Button
                          onClick={copyToClipboard}
                          variant="outline"
                          className="flex-1"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          onClick={mockPost}
                          className="flex-1"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Post
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Sparkles className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>Fill in the form and click "Generate AI Content" to see your post preview here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIContentGenerator;