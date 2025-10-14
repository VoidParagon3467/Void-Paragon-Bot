import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NovelsPage() {
  const [novels, setNovels] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const novelsRef = ref(db, "novels");
    onValue(novelsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setNovels(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      }
    });
  }, []);

  const filtered = novels.filter(n => {
    if (filter === "premium") return n.isPremium;
    if (filter === "trending") return n.views > 10000;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-serif text-4xl text-primary mb-6">Novels</h1>
      
      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setFilter("all")}>All</TabsTrigger>
          <TabsTrigger value="trending" onClick={() => setFilter("trending")}>Trending</TabsTrigger>
          <TabsTrigger value="premium" onClick={() => setFilter("premium")}>Premium</TabsTrigger>
        </TabsList>
      </Tabs>

      <Input placeholder="Search novels..." className="mb-6" data-testid="input-search" />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map((novel) => (
          <div key={novel.id} className="border border-border rounded-lg p-4 hover-elevate">
            <div className="aspect-[2/3] bg-gradient-to-br from-primary/20 to-purple-900/40 rounded-md mb-3" />
            <h3 className="font-serif text-lg text-primary mb-1">{novel.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">by {novel.author}</p>
            <Button size="sm" className="w-full">Read</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
