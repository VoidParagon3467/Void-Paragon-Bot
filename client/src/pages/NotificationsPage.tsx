import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const notifRef = ref(db, `notifications/${auth.currentUser.uid}`);
    onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setNotifications(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      }
    });
  }, []);

  const markAsRead = (id: string) => {
    if (!auth.currentUser) return;
    update(ref(db, `notifications/${auth.currentUser.uid}/${id}`), { read: true });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-serif text-4xl text-primary mb-6">Notifications</h1>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-muted-foreground">No notifications</p>
        ) : (
          notifications.map((notif) => (
            <Card key={notif.id} className={`p-4 ${notif.read ? "opacity-50" : ""}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium mb-1">{notif.title}</h3>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                </div>
                {!notif.read && (
                  <Button size="sm" onClick={() => markAsRead(notif.id)}>
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
