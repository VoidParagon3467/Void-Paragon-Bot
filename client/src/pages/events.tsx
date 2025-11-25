import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  voidCrystals: number;
  sectPoints: number;
}

interface Event {
  id: number;
  type: string;
  title: string;
  description?: string;
  entryCost: number;
  entryCostType: string;
  questionsJson?: any[];
  endsAt: string;
  isActive: boolean;
}

interface EventQuestion {
  id: number;
  question: string;
  choices: string[];
}

export default function EventsPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [joining, setJoining] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = sessionStorage.getItem("auth_session");
    if (!token) setLocation("/login");
    else setSessionToken(token);
  }, []);

  const { data: user } = useQuery<User | null>({
    queryKey: [`/api/auth/me`, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return null;
      const res = await fetch(`/api/auth/me?session=${sessionToken}`);
      return res.ok ? res.json() : null;
    },
    enabled: !!sessionToken,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: [`/api/events`],
    queryFn: async () => {
      const res = await fetch(`/api/events`);
      return res.ok ? res.json() : [];
    },
  });

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  const handleJoinEvent = async () => {
    if (!user || !selectedEvent) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/events/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          eventId: selectedEvent.id,
          answers: selectedAnswers,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Event joined!", description: data.message });
        setSelectedEvent(null);
        setSelectedAnswers({});
        queryClient.invalidateQueries({ queryKey: [`/api/events`] });
      } else {
        toast({ title: "❌ Failed", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Failed to join event", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Sect Events</h1>
        </div>

        {selectedEvent ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedEvent.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                  ← Back
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>

              {selectedEvent.questionsJson && selectedEvent.questionsJson.length > 0 && (
                <div className="space-y-4">
                  <p className="font-semibold">Event Questions:</p>
                  {selectedEvent.questionsJson.map((q: EventQuestion) => (
                    <div key={q.id} className="space-y-2 p-3 border rounded-md">
                      <p className="font-medium">{q.question}</p>
                      <div className="space-y-2">
                        {q.choices.map((choice, idx) => (
                          <Button
                            key={idx}
                            variant={selectedAnswers[q.id] === idx ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: idx })}
                            data-testid={`button-choice-q${q.id}-${idx}`}
                          >
                            {choice}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleJoinEvent}
                disabled={joining}
                className="w-full"
                data-testid="button-join-event"
              >
                {joining ? "Joining..." : `Join Event (${selectedEvent.entryCost} ${selectedEvent.entryCostType.toUpperCase()})`}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Active Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Check back soon for exciting events!</p>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card key={event.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedEvent(event)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <Badge>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="text-xs mt-2">Cost: {event.entryCost} {event.entryCostType.toUpperCase()}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
