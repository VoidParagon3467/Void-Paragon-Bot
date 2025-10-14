import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ChatMessageProps {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  avatar?: string;
  isCurrentUser?: boolean;
  image?: string;
}

export function ChatMessage({ id, sender, message, timestamp, avatar, isCurrentUser, image }: ChatMessageProps) {
  return (
    <div 
      className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
      data-testid={`message-${id}`}
    >
      <Avatar className="h-8 w-8 border border-primary">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {sender[0]}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-primary">{sender}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        </div>
        
        <div className={`rounded-lg p-3 max-w-md ${
          isCurrentUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card border border-card-border'
        }`}>
          {image && (
            <img 
              src={image} 
              alt="Shared image" 
              className="rounded-md mb-2 max-w-full"
            />
          )}
          <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        </div>
      </div>
    </div>
  );
}
