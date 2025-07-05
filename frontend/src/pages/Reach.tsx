import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { config } from '@/config';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface ReachDetail {
  platform: string;
  audienceSize: number;
  username: string;
  subredditName?: string; // Added subredditName here
  engagement?: { // New field for engagement metrics
    likes?: number;
    retweets?: number;
    replies?: number;
    karma?: number;
  };
}

const Reach = () => {
  const { token } = useAuth();
  const [reach, setReach] = useState<{ totalAudienceSize: number, details: ReachDetail[] }>({ totalAudienceSize: 0, details: [] });

  useEffect(() => {
    const fetchReach = async () => {
      try {
        const resp = await fetch(`${config.BACKEND_URL}/api/user/reach`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          setReach(await resp.json());
        }
      } catch (e) {
        // handle error
        console.log(e);
      }
    };
    fetchReach();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Reach Analytics</CardTitle>
            <CardDescription>Audience size and engagement breakdown by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-4">Total Audience Size: {reach.totalAudienceSize}</div>
            {/* Histogram */}
            <div className="w-full h-64 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reach.details}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="audienceSize" fill="#2563eb" name="Audience Size" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {reach.details.map((d) => (
                <li key={d.platform}>
                  <span className="font-semibold">{d.platform}:</span> {d.audienceSize} (
                  <span>
                    {d.platform === 'reddit' ? d.subredditName : d.username}
                  </span>
                  )
                  {d.engagement && (
                    <div className="ml-4 text-sm text-gray-600">
                      {d.platform === 'twitter' && (
                        <>
                          Likes: {d.engagement.likes}, Retweets: {d.engagement.retweets}, Replies: {d.engagement.replies}
                        </>
                      )}
                      {d.platform === 'reddit' && (
                        <>
                          Karma: {d.engagement.karma}
                        </>
                      )}
                      {d.platform === 'telegram' && (
                        <>
                          Members: {d.audienceSize}
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reach;