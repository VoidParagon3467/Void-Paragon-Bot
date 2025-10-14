import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [novels, setNovels] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = ref(db, `users/${auth.currentUser.uid}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setBio(data.bio || "");
        setAvatar(data.avatar || "");
      }
    });

    onValue(ref(db, "novels"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userNovels = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((n: any) => n.authorId === auth.currentUser?.uid);
        setNovels(userNovels);
      }
    });
  }, []);

  const saveProfile = () => {
    if (!auth.currentUser) return;
    update(ref(db, `users/${auth.currentUser.uid}`), { bio, avatar });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-serif text-4xl text-primary mb-6">Profile</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Avatar URL</label>
            <Input
              placeholder="https://..."
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              data-testid="input-avatar"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Bio</label>
            <Textarea
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              data-testid="textarea-bio"
            />
          </div>
          <Button onClick={saveProfile} data-testid="button-save-profile">Save Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Novels</CardTitle>
        </CardHeader>
        <CardContent>
          {novels.length === 0 ? (
            <p className="text-muted-foreground">No novels yet</p>
          ) : (
            <div className="space-y-3">
              {novels.map((novel) => (
                <div key={novel.id} className="p-3 border border-border rounded">
                  <p className="font-medium">{novel.title}</p>
                  <p className="text-sm text-muted-foreground">{novel.status}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
