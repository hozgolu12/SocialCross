
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import {config} from "@/config"

const TelegramSetup = () => {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');

  const handleConnect = async () => {
    if (!botToken || !channelId) {
      toast({
        title: "Error",
        description: "Please fill in both Bot Token and Channel ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Redirect to backend OAuth with credentials
    window.location.href = `${config.BACKEND_URL}/api/oauth/telegram?userId=${userId}&botToken=${botToken}&channelId=${channelId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Telegram Bot</CardTitle>
          <CardDescription>
            Set up your Telegram bot to post messages to channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="text"
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">
              Get this from @BotFather on Telegram
            </p>
          </div>

          <div>
            <Label htmlFor="channelId">Channel ID</Label>
            <Input
              id="channelId"
              type="text"
              placeholder="@yourchannel or -1001234567890"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">
              Your channel username or ID (bot must be admin)
            </p>
          </div>

          <Button 
            onClick={handleConnect} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Connecting...' : 'Connect Telegram'}
          </Button>

          <div className="text-xs text-gray-600 space-y-2">
            <p><strong>Setup Instructions:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Message @BotFather on Telegram</li>
              <li>Use /newbot command to create a bot</li>
              <li>Copy the bot token</li>
              <li>Add your bot to your channel as admin</li>
              <li>Get your channel ID (use @userinfobot)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramSetup;