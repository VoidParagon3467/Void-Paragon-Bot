import { Star, Crown, Eye, Heart } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NovelCardProps {
  id: string;
  title: string;
  author: string;
  cover?: string;
  genre: string;
  rating: number;
  views: number;
  likes: number;
  isPremium?: boolean;
  status: "ongoing" | "completed";
  synopsis?: string;
  onRead: (id: string) => void;
}

export function NovelCard({ id, title, author, cover, genre, rating, views, likes, isPremium, status, synopsis, onRead }: NovelCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate transition-all duration-300 group" data-testid={`card-novel-${id}`}>
      <div className="relative aspect-[2/3] overflow-hidden">
        {cover ? (
          <img 
            src={cover} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-900/40 flex items-center justify-center">
            <span className="font-serif text-6xl text-primary">{title[0]}</span>
          </div>
        )}
        {isPremium && (
          <Badge className="absolute top-2 right-2 bg-premium text-premium-foreground">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        )}
        <Badge className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm">
          {status}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-serif font-semibold text-lg text-primary mb-1 line-clamp-2" data-testid={`text-novel-title-${id}`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">by {author}</p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span>{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{views.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>{likes.toLocaleString()}</span>
          </div>
        </div>

        <Badge variant="secondary" className="text-xs">
          {genre}
        </Badge>
        
        {synopsis && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{synopsis}</p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={() => onRead(id)}
          data-testid={`button-read-${id}`}
        >
          Read Now
        </Button>
      </CardFooter>
    </Card>
  );
}
