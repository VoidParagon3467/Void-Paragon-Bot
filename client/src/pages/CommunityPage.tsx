import { useState, useEffect } from "react";
import { ref, push, onValue } from "firebase/database";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CommunityPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const messagesRef = ref(db, "community/global");
    onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMessages(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      }
    });
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    push(ref(db, "community/global"), {
      sender: auth.currentUser?.email || "Guest",
      message: newMessage,
      timestamp: Date.now()
    });
    setNewMessage("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-serif text-4xl text-primary mb-6">Community</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Global Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto mb-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-card border border-border rounded p-3">
                <p className="text-sm font-medium text-primary">{msg.sender}</p>
                <p className="text-sm">{msg.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              data-testid="input-message"
            />
            <Button onClick={sendMessage} data-testid="button-send">Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
