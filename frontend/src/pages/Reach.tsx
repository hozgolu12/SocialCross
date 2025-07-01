import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { config } from '@/config';

interface ReachDetail {
  platform: string;
  followers: number;
  username: string;
}

const Reach = () => {
  const { token } = useAuth();
  const [reach, setReach] = useState<{ totalReach: number, details: ReachDetail[] }>({ totalReach: 0, details: [] });

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
            <CardTitle>Reach Details</CardTitle>
            <CardDescription>Followers/subscribers breakdown by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-4">Total Reach: {reach.totalReach}</div>
            <ul className="space-y-2">
              {reach.details.map((d) => (
                <li key={d.platform}>
                  <span className="font-semibold">{d.platform}:</span> {d.followers} ({d.username})
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