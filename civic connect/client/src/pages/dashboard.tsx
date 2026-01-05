import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { api, Grievance, CreateGrievanceData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, MessageCircle, Share, AlertTriangle, MapPin, Calendar, Upload, X, Eye, ZoomIn, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CommentModal } from '@/components/comment-modal';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    category: 'all',
    municipality: 'all',
    status: 'all',
    sortBy: 'newest',
    search: ''
  });
  
  const [showPostForm, setShowPostForm] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState<CreateGrievanceData>({
    title: '',
    description: '',
    category: '',
    municipality: user?.municipality || '',
    location: '',
    status: 'pending'
  });
  
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    grievanceId: string;
    grievanceTitle: string;
  }>({
    isOpen: false,
    grievanceId: '',
    grievanceTitle: ''
  });

  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
  }>({
    isOpen: false,
    imageUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch grievances with filters
  const { data: grievancesData, isLoading } = useQuery({
    queryKey: ['/api/grievances', filters],
    queryFn: () => api.getGrievances(filters),
  });

  // Create grievance mutation
  const createGrievanceMutation = useMutation({
    mutationFn: (data: CreateGrievanceData) => api.createGrievance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grievances'] });
      setGrievanceForm({
        title: '',
        description: '',
        category: '',
        municipality: user?.municipality || '',
        location: '',
        status: 'pending'
      });
      // Reset image state
      setSelectedFile(null);
      setUploadedImageUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowPostForm(false);
      toast({
        title: "Success",
        description: "Grievance posted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create grievance",
        variant: "destructive"
      });
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: ({ id, voteType }: { id: string; voteType: 'up' | 'down' }) => 
      api.voteOnGrievance(id, voteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grievances'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to vote",
        variant: "destructive"
      });
    }
  });

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => api.uploadImage(file),
    onSuccess: (result) => {
      setUploadedImageUrl(result.imageUrl);
      setGrievanceForm(prev => ({ ...prev, imageUrl: result.imageUrl }));
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    }
  });

  // File upload handlers
  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Only JPEG, PNG, and WebP images are allowed",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setIsUploading(true);
    uploadImageMutation.mutate(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = () => {
    setSelectedFile(null);
    setUploadedImageUrl('');
    setGrievanceForm(prev => ({ ...prev, imageUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitGrievance = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!grievanceForm.title || !grievanceForm.description || !grievanceForm.category || !grievanceForm.municipality) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    createGrievanceMutation.mutate(grievanceForm);
  };

  const handleVote = (grievanceId: string, voteType: 'up' | 'down') => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please login to vote",
        variant: "destructive"
      });
      return;
    }
    
    voteMutation.mutate({ id: grievanceId, voteType });
  };

  const openCommentModal = (grievanceId: string, grievanceTitle: string) => {
    setCommentModal({
      isOpen: true,
      grievanceId,
      grievanceTitle
    });
  };

  const closeCommentModal = () => {
    setCommentModal({
      isOpen: false,
      grievanceId: '',
      grievanceTitle: ''
    });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'urgent': return 'destructive';
      case 'in-progress': return 'default';
      case 'resolved': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Civic Grievance Platform</h1>
            <p className="text-muted-foreground">Welcome, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={logout} data-testid="button-logout">
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Sort By</Label>
                  <Select 
                    value={filters.sortBy} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="upvotes-high">Most Upvoted</SelectItem>
                      <SelectItem value="upvotes-low">Least Upvoted</SelectItem>
                      <SelectItem value="urgent">Urgent First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select 
                    value={filters.category} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="sanitation">Sanitation</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Search</Label>
                  <Input
                    placeholder="Search grievances..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    data-testid="input-search"
                  />
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setFilters({
                    category: 'all',
                    municipality: 'all',
                    status: 'all',
                    sortBy: 'newest',
                    search: ''
                  })}
                  data-testid="button-reset-filters"
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Post New Grievance */}
            <Card>
              <CardHeader>
                <CardTitle>Report a New Issue</CardTitle>
              </CardHeader>
              <CardContent>
                {!showPostForm ? (
                  <Button 
                    onClick={() => setShowPostForm(true)}
                    className="w-full"
                    data-testid="button-new-grievance"
                  >
                    What's the issue in your area?
                  </Button>
                ) : (
                  <form onSubmit={handleSubmitGrievance} className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        placeholder="Brief description of the issue"
                        value={grievanceForm.title}
                        onChange={(e) => setGrievanceForm(prev => ({ ...prev, title: e.target.value }))}
                        data-testid="input-grievance-title"
                      />
                    </div>

                    <div>
                      <Label>Category</Label>
                      <Select 
                        value={grievanceForm.category} 
                        onValueChange={(value) => setGrievanceForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger data-testid="select-grievance-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                          <SelectItem value="sanitation">Sanitation</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="environment">Environment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Location</Label>
                      <Input
                        placeholder="Specific location"
                        value={grievanceForm.location}
                        onChange={(e) => setGrievanceForm(prev => ({ ...prev, location: e.target.value }))}
                        data-testid="input-grievance-location"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Detailed description of the issue"
                        value={grievanceForm.description}
                        onChange={(e) => setGrievanceForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        data-testid="textarea-grievance-description"
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div>
                      <Label>Photo (Optional)</Label>
                      <div className="space-y-3">
                        {/* Drag & Drop Area */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          data-testid="image-upload-area"
                        >
                          {uploadedImageUrl ? (
                            <div className="space-y-3">
                              <div className="relative inline-block">
                                <img
                                  src={uploadedImageUrl}
                                  alt="Uploaded preview"
                                  className="max-w-full max-h-48 rounded-lg object-cover"
                                  data-testid="image-preview"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage();
                                  }}
                                  data-testid="button-remove-image"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">Click to replace image</p>
                            </div>
                          ) : uploadImageMutation.isPending ? (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 mx-auto text-muted-foreground animate-pulse" />
                              <p className="text-sm text-muted-foreground">Uploading image...</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Drag & drop an image here, or click to select
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Supports JPEG, PNG, WebP up to 5MB
                              </p>
                            </div>
                          )}
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileInputChange}
                            className="hidden"
                            data-testid="file-input"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setGrievanceForm(prev => ({ 
                          ...prev, 
                          status: prev.status === 'urgent' ? 'pending' : 'urgent' 
                        }))}
                        data-testid="button-mark-urgent"
                        className={grievanceForm.status === 'urgent' ? 'bg-destructive text-destructive-foreground' : ''}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {grievanceForm.status === 'urgent' ? 'Urgent' : 'Mark as Urgent'}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={createGrievanceMutation.isPending}
                        data-testid="button-submit-grievance"
                      >
                        {createGrievanceMutation.isPending ? 'Posting...' : 'Post Grievance'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowPostForm(false)}
                        data-testid="button-cancel-grievance"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Grievances Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Grievances ({grievancesData?.total || 0})
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-full"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : grievancesData?.grievances?.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No grievances found. Be the first to report an issue!</p>
                  </CardContent>
                </Card>
              ) : (
                grievancesData?.grievances?.map((grievance) => (
                  <Card key={grievance.id} data-testid={`grievance-card-${grievance.id}`}>
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {grievance.authorUsername.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{grievance.authorUsername}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {getTimeAgo(grievance.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{grievance.category}</Badge>
                          <Badge variant="outline">{grievance.municipality}</Badge>
                          <Badge variant={getStatusBadgeVariant(grievance.status)}>
                            {grievance.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">{grievance.title}</h3>
                        <p className="text-muted-foreground">{grievance.description}</p>
                        {grievance.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {grievance.location}
                          </p>
                        )}
                        
                        {/* Uploaded Image */}
                        {grievance.imageUrl && (
                          <div className="mt-3">
                            <div 
                              className="relative inline-block cursor-pointer group"
                              onClick={() => setImageModal({ isOpen: true, imageUrl: grievance.imageUrl! })}
                              data-testid={`image-${grievance.id}`}
                            >
                              <img
                                src={grievance.imageUrl}
                                alt="Grievance photo"
                                className="max-w-full max-h-64 rounded-lg object-cover border"
                                loading="lazy"
                              />
                              {/* Overlay with zoom icon */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant={grievance.userVote === 'up' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleVote(grievance.id, 'up')}
                              data-testid={`button-upvote-${grievance.id}`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium">
                              {grievance.upvotes - grievance.downvotes}
                            </span>
                            <Button
                              variant={grievance.userVote === 'down' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleVote(grievance.id, 'down')}
                              data-testid={`button-downvote-${grievance.id}`}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openCommentModal(grievance.id, grievance.title)}
                            data-testid={`button-comments-${grievance.id}`}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Comments
                          </Button>
                          
                          <Button variant="ghost" size="sm" data-testid={`button-share-${grievance.id}`}>
                            <Share className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={commentModal.isOpen}
        onClose={closeCommentModal}
        grievanceId={commentModal.grievanceId}
        grievanceTitle={commentModal.grievanceTitle}
      />

      {/* Image Modal */}
      <Dialog open={imageModal.isOpen} onOpenChange={(open) => setImageModal({ isOpen: open, imageUrl: '' })}>
        <DialogContent className="max-w-4xl w-full p-2">
          <div className="relative">
            <img
              src={imageModal.imageUrl}
              alt="Full size image"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              data-testid="modal-image"
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setImageModal({ isOpen: false, imageUrl: '' })}
              data-testid="button-close-modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}