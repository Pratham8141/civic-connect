import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api, Comment } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThumbsUp, Trash2, Edit3 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grievanceId: string;
  grievanceTitle: string;
}

export function CommentModal({ isOpen, onClose, grievanceId, grievanceTitle }: CommentModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['/api/grievances', grievanceId, 'comments'],
    queryFn: () => api.getComments(grievanceId),
    enabled: isOpen,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (text: string) => api.createComment(grievanceId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grievances', grievanceId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grievances'] }); // Update comment count
      setNewComment('');
      toast({
        title: "Success",
        description: "Comment added successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive"
      });
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.updateComment(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grievances', grievanceId, 'comments'] });
      setEditingComment(null);
      toast({
        title: "Success",
        description: "Comment updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update comment",
        variant: "destructive"
      });
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => api.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grievances', grievanceId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grievances'] }); // Update comment count
      toast({
        title: "Success",
        description: "Comment deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete comment",
        variant: "destructive"
      });
    }
  });

  // Vote on comment mutation
  const voteCommentMutation = useMutation({
    mutationFn: ({ id, voteType }: { id: string; voteType: 'up' | 'down' }) => 
      api.voteOnComment(id, voteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grievances', grievanceId, 'comments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to vote",
        variant: "destructive"
      });
    }
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive"
      });
      return;
    }

    createCommentMutation.mutate(newComment);
  };

  const handleUpdateComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingComment || !editingComment.text.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive"
      });
      return;
    }

    updateCommentMutation.mutate({
      id: editingComment.id,
      text: editingComment.text
    });
  };

  const handleVoteComment = (commentId: string, voteType: 'up' | 'down') => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please login to vote",
        variant: "destructive"
      });
      return;
    }
    
    voteCommentMutation.mutate({ id: commentId, voteType });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffMs = now.getTime() - commentTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments - {grievanceTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add New Comment */}
          {user && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                data-testid="textarea-new-comment"
              />
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createCommentMutation.isPending}
                  data-testid="button-add-comment"
                >
                  {createCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </form>
          )}

          <Separator />

          {/* Comments List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                  </div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-3" data-testid={`comment-${comment.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {comment.authorUsername.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{comment.authorUsername}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTimeAgo(comment.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    {user && user.id === comment.authorId && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingComment({ id: comment.id, text: comment.text })}
                          data-testid={`button-edit-comment-${comment.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          data-testid={`button-delete-comment-${comment.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingComment?.id === comment.id ? (
                    <form onSubmit={handleUpdateComment} className="space-y-2">
                      <Textarea
                        value={editingComment.text}
                        onChange={(e) => setEditingComment(prev => 
                          prev ? { ...prev, text: e.target.value } : null
                        )}
                        rows={3}
                        data-testid={`textarea-edit-comment-${comment.id}`}
                      />
                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={updateCommentMutation.isPending}
                          data-testid={`button-save-comment-${comment.id}`}
                        >
                          {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button 
                          type="button" 
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingComment(null)}
                          data-testid={`button-cancel-edit-${comment.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="text-sm">{comment.text}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant={comment.userVote === 'up' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => handleVoteComment(comment.id, 'up')}
                            data-testid={`button-upvote-comment-${comment.id}`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {comment.upvotes}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-close-comments">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}