import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface AdminPanelProps {
  serverId: string;
}

export default function AdminPanel({ serverId }: AdminPanelProps) {
  return (
    <Card className="glass-card border-yellow-500/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold text-yellow-400 font-mono">
          <i className="fas fa-crown mr-2" />
          Sect Master Controls
        </CardTitle>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          Divine Powers Active
        </Badge>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin">
            <Button className="glass-card p-4 rounded-lg hover:border-yellow-500/50 transition-all group w-full h-auto bg-transparent border border-primary/30">
              <div className="text-center">
                <i className="fas fa-users text-2xl text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-semibold">Manage Players</div>
                <div className="text-xs text-muted-foreground">View all cultivators</div>
              </div>
            </Button>
          </Link>
          
          <Button className="glass-card p-4 rounded-lg hover:border-primary/50 transition-all group w-full h-auto bg-transparent border border-primary/30">
            <div className="text-center">
              <i className="fas fa-cog text-2xl text-primary mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold">Server Settings</div>
              <div className="text-xs text-muted-foreground">Configure bot</div>
            </div>
          </Button>
          
          <Button className="glass-card p-4 rounded-lg hover:border-purple-500/50 transition-all group w-full h-auto bg-transparent border border-primary/30">
            <div className="text-center">
              <i className="fas fa-chart-line text-2xl text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold">Analytics</div>
              <div className="text-xs text-muted-foreground">Server statistics</div>
            </div>
          </Button>
          
          <Button className="glass-card p-4 rounded-lg hover:border-red-500/50 transition-all group w-full h-auto bg-transparent border border-primary/30">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-2xl text-red-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold">Moderation</div>
              <div className="text-xs text-muted-foreground">Discipline tools</div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
