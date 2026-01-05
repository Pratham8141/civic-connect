# CivicConnect – Civic Grievance Reporting Platform

## Overview
CivicConnect is a civic grievance reporting platform that helps citizens report local issues like potholes, streetlight failures, and waste problems.  
It works similar to a social media feed for citizens, while municipal authorities get a separate admin dashboard to manage and resolve complaints.

---

## Key Features
- Citizens can report civic issues with photos and location
- Social media–style feed for viewing and tracking complaints
- Separate admin dashboard for authorities
- Issue status tracking (reported, assigned, resolved)
- Leaderboards and performance metrics for engagement

---

## AI Image Verification
An AI model is used to **verify the authenticity of uploaded images**.  
For example, it checks whether an image actually contains a pothole, garbage, or street damage before accepting the complaint. This helps reduce fake or irrelevant reports.

---

## Tech Stack
### Frontend
- HTML, CSS, JavaScript
- React (with shadcn/ui & Radix UI)
- Responsive and theme-based UI

### Backend
- Node.js with Express
- TypeScript

### Database
- **Firebase** (for storing users, grievances, images, and status updates)

### AI
- Image classification model for civic issue verification

---

## Authentication
- Separate login for citizens and administrators
- Role-based access and dashboards

---

## How It Works
1. User reports an issue with image and location
2. AI verifies the image authenticity
3. Data is stored in Firebase
4. Admin reviews and assigns the issue
5. Status updates are visible to the user

---

## Author
Pratham Sharma
