# Design Guidelines for Civic Grievance Platform

## Design Approach
**Reference-Based Approach**: Taking inspiration from Reddit and social media platforms while maintaining a professional civic tone. The platform should feel familiar and engaging like social media but convey trust and authority appropriate for civic services.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Main brand: 220 70% 45% (professional blue for trust and authority)
- Success: 142 76% 36% (for resolved issues)
- Warning: 43 96% 56% (for pending issues)
- Danger: 0 84% 60% (for urgent issues)

**Dark Mode:**
- Background: 222 84% 5%
- Surface: 220 13% 9%
- Text primary: 210 40% 98%

### B. Typography
- **Primary Font**: Inter or System UI stack for readability
- **Headers**: Bold weights (600-700) for hierarchy
- **Body Text**: Regular (400) and medium (500) weights
- **Size Scale**: 14px base, 16px body, 18px-32px for headings

### C. Layout System
**Spacing**: Use consistent units of 4px, 8px, 16px, 24px, and 32px for margins, padding, and gaps
**Grid**: Max-width containers with responsive breakpoints
**Cards**: Consistent card-based layout for grievances, comments, and admin sections

### D. Component Library

**Navigation:**
- Clean horizontal navbar with platform logo
- User avatar/login button on right
- Admin badge for admin users

**Grievance Cards:**
- Photo thumbnail on left (if available)
- Title, description, and metadata on right
- Upvote/downvote buttons (Reddit-style)
- Comment count and timestamp
- Municipality tag as colored badge
- Status indicator (pending/in-progress/resolved)

**Forms:**
- Clean, accessible form inputs with proper labels
- File upload areas with drag-and-drop styling
- Municipality selector dropdown
- Rich text editor for descriptions

**Admin Dashboard:**
- Sidebar navigation for different admin sections
- Data cards showing key metrics
- Work allocation interface with department assignments
- Filterable and sortable grievance lists

**Comments System:**
- Threaded comment display
- Reply functionality with indentation
- User avatars and timestamps
- Upvote buttons for comments

**Reports & Analytics:**
- Chart visualizations for trends
- Filter controls for area/type/time
- Leaderboard tables with rankings
- Performance indicators

### E. Key Features Styling

**Upvote System:**
- Vertical arrow buttons (up/down) similar to Reddit
- Vote count display between arrows
- Color changes for voted items (blue for upvoted)

**Municipality Tags:**
- Colored badges with rounded corners
- Distinct colors for different municipalities
- Small and unobtrusive but clearly visible

**Status Indicators:**
- Color-coded status badges (pending=orange, progress=blue, resolved=green)
- Clear iconography for quick recognition

**Media Integration:**
- Clean photo display with lightbox capability
- Thumbnail grids for multiple photos
- Video embed support if needed

## Images
**No large hero image required**. This is a utility-focused platform where content (grievances) is the hero. Use:
- Placeholder avatars for users
- Icon placeholders for municipalities
- Sample grievance photos in the feed
- Charts/graphs for admin analytics
- Small illustrative icons throughout the interface

## Additional Considerations
- Ensure high contrast ratios for accessibility
- Mobile-first responsive design
- Loading states for all interactive elements
- Error states for forms and failed uploads
- Empty states for sections with no content
- Toast notifications for user actions (voting, commenting, posting)

The overall aesthetic should balance social media engagement patterns with the professionalism expected from civic platforms, creating an approachable yet authoritative user experience.