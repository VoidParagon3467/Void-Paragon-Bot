import { useState, useEffect } from "react";
import { ref, onValue, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [novels, setNovels] = useState<any[]>([]);
  const [stripeKey, setStripeKey] = useState("");

  useEffect(() => {
    onValue(ref(db, "users"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUsers(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      }
    });

    onValue(ref(db, "novels"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setNovels(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      }
    });

    onValue(ref(db, "config/stripeKey"), (snapshot) => {
      if (snapshot.exists()) {
        setStripeKey(snapshot.val());
      }
    });
  }, []);

  const saveStripeKey = () => {
    update(ref(db, "config"), { stripeKey });
  };

  const togglePremium = (novelId: string, current: boolean) => {
    update(ref(db, `novels/${novelId}`), { isPremium: !current });
  };

  const makeModerator = (userId: string) => {
    update(ref(db, `users/${userId}`), { role: "moderator" });
  };

  const deleteUser = (userId: string) => {
    if (confirm("Delete this user?")) {
      remove(ref(db, `users/${userId}`));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-serif text-4xl text-primary mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="novels">Novels</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded">
                    <div>
                      <p className="font-medium">{user.username || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.role || "user"}</p>
                    </div>
                    <div className="flex gap-2">
                      {user.role !== "moderator" && (
                        <Button size="sm" onClick={() => makeModerator(user.id)}>
                          Make Moderator
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => deleteUser(user.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="novels">
          <Card>
            <CardHeader>
              <CardTitle>All Novels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {novels.map((novel) => (
                  <div key={novel.id} className="flex items-center justify-between p-3 border border-border rounded">
                    <div>
                      <p className="font-medium">{novel.title}</p>
                      <p className="text-sm text-muted-foreground">by {novel.author}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2">
                        <span className="text-sm">Premium</span>
                        <Switch
                          checked={novel.isPremium || false}
                          onCheckedChange={() => togglePremium(novel.id, novel.isPremium)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Stripe Secret Key</label>
                <Input
                  type="password"
                  placeholder="sk_live_..."
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  data-testid="input-stripe-key"
                />
              </div>
              <Button onClick={saveStripeKey} data-testid="button-save-stripe">
                Save Stripe Key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
