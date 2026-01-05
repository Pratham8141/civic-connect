import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  insertUserSchema,
  insertGrievanceSchema,
  insertCommentSchema,
  insertDepartmentSchema,
  insertAssignmentSchema,
  insertUserVoteSchema,
} from "@shared/schema";
import { z } from "zod";

// Session configuration
declare module "express-session" {
  interface SessionData {
    userId?: string;
    userType?: string;
  }
}

const pgSession = ConnectPgSimple(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      store: new pgSession({
        conString: process.env.DATABASE_URL,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session.userId || req.session.userType !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Configure multer for file uploads
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and random string
      const timestamp = Date.now();
      const randomStr = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname);
      cb(null, `${timestamp}-${randomStr}${ext}`);
    }
  });

  const fileFilter = (req: any, file: any, cb: any) => {
    // Allow only image files
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
    }
  };

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter,
  });

  // File upload endpoints
  app.post("/api/upload", requireAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imageUrl = `/api/images/${req.file.filename}`;
      res.json({ 
        imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  // Serve uploaded images
  app.get("/api/images/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Serve the file
    res.sendFile(filePath);
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Set session
      req.session.userId = user.id;
      req.session.userType = user.type;

      // Remove password from response
      const { password, ...userResponse } = user;
      res.json({ user: userResponse });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userType = user.type;

      // Remove password from response
      const { password: _, ...userResponse } = user;
      res.json({ user: userResponse });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password, ...userResponse } = user;
      res.json({ user: userResponse });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Grievance routes
  app.get("/api/grievances", async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        municipality: req.query.municipality as string,
        status: req.query.status as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await storage.getGrievances(filters);
      
      // Add user vote information for authenticated users
      if (req.session.userId) {
        for (const grievance of result.grievances) {
          const userVote = await storage.getUserVote(req.session.userId, grievance.id);
          (grievance as any).userVote = userVote?.voteType || null;
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Get grievances error:", error);
      res.status(500).json({ error: "Failed to get grievances" });
    }
  });

  app.get("/api/grievances/:id", async (req, res) => {
    try {
      const grievance = await storage.getGrievance(req.params.id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      // Add user vote information for authenticated users
      if (req.session.userId) {
        const userVote = await storage.getUserVote(req.session.userId, grievance.id);
        (grievance as any).userVote = userVote?.voteType || null;
      }

      res.json(grievance);
    } catch (error) {
      console.error("Get grievance error:", error);
      res.status(500).json({ error: "Failed to get grievance" });
    }
  });

  app.post("/api/grievances", requireAuth, async (req, res) => {
    try {
      const grievanceData = insertGrievanceSchema.parse({
        ...req.body,
        authorId: req.session.userId,
      });

      const grievance = await storage.createGrievance(grievanceData);
      res.status(201).json(grievance);
    } catch (error) {
      console.error("Create grievance error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create grievance" });
    }
  });

  app.patch("/api/grievances/:id", requireAuth, async (req, res) => {
    try {
      const grievance = await storage.getGrievance(req.params.id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      // Check ownership or admin privileges
      if (grievance.authorId !== req.session.userId && req.session.userType !== "admin") {
        return res.status(403).json({ error: "Permission denied" });
      }

      const updates = req.body;
      const updatedGrievance = await storage.updateGrievance(req.params.id, updates);
      
      res.json(updatedGrievance);
    } catch (error) {
      console.error("Update grievance error:", error);
      res.status(500).json({ error: "Failed to update grievance" });
    }
  });

  app.delete("/api/grievances/:id", requireAuth, async (req, res) => {
    try {
      const grievance = await storage.getGrievance(req.params.id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      // Check ownership or admin privileges
      if (grievance.authorId !== req.session.userId && req.session.userType !== "admin") {
        return res.status(403).json({ error: "Permission denied" });
      }

      const deleted = await storage.deleteGrievance(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      res.json({ message: "Grievance deleted successfully" });
    } catch (error) {
      console.error("Delete grievance error:", error);
      res.status(500).json({ error: "Failed to delete grievance" });
    }
  });

  // Voting routes
  app.post("/api/grievances/:id/vote", requireAuth, async (req, res) => {
    try {
      const { voteType } = req.body;
      
      if (!voteType || !['up', 'down'].includes(voteType)) {
        return res.status(400).json({ error: "Invalid vote type" });
      }

      const grievance = await storage.getGrievance(req.params.id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      // Check if user already voted
      const existingVote = await storage.getUserVote(req.session.userId!, req.params.id);
      
      if (existingVote && existingVote.voteType === voteType) {
        // Remove vote if clicking same vote type
        await storage.removeVote(req.session.userId!, req.params.id);
      } else {
        // Create or update vote
        await storage.createOrUpdateVote({
          userId: req.session.userId!,
          grievanceId: req.params.id,
          voteType,
        });
      }

      // Update vote counts
      await storage.updateVoteCounts(req.params.id);

      // Get updated grievance
      const updatedGrievance = await storage.getGrievance(req.params.id);
      const userVote = await storage.getUserVote(req.session.userId!, req.params.id);
      
      res.json({
        upvotes: updatedGrievance?.upvotes || 0,
        downvotes: updatedGrievance?.downvotes || 0,
        userVote: userVote?.voteType || null,
      });
    } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ error: "Failed to process vote" });
    }
  });

  // Comment routes
  app.get("/api/grievances/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      
      // Add user vote information for authenticated users
      if (req.session.userId) {
        for (const comment of comments) {
          const userVote = await storage.getUserVote(req.session.userId, undefined, comment.id);
          (comment as any).userVote = userVote?.voteType || null;
        }
      }

      res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ error: "Failed to get comments" });
    }
  });

  app.post("/api/grievances/:id/comments", requireAuth, async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        grievanceId: req.params.id,
        authorId: req.session.userId,
      });

      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.patch("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const comment = await storage.updateComment(req.params.id, text);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      res.json(comment);
    } catch (error) {
      console.error("Update comment error:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteComment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Comment not found" });
      }

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Comment voting routes
  app.post("/api/comments/:id/vote", requireAuth, async (req, res) => {
    try {
      const { voteType } = req.body;
      
      if (!voteType || !['up', 'down'].includes(voteType)) {
        return res.status(400).json({ error: "Invalid vote type" });
      }

      // Check if user already voted
      const existingVote = await storage.getUserVote(req.session.userId!, undefined, req.params.id);
      
      if (existingVote && existingVote.voteType === voteType) {
        // Remove vote if clicking same vote type
        await storage.removeVote(req.session.userId!, undefined, req.params.id);
      } else {
        // Create or update vote
        await storage.createOrUpdateVote({
          userId: req.session.userId!,
          commentId: req.params.id,
          voteType,
        });
      }

      // Update vote counts
      await storage.updateVoteCounts(undefined, req.params.id);

      // Get updated vote count
      const userVote = await storage.getUserVote(req.session.userId!, undefined, req.params.id);
      
      res.json({
        userVote: userVote?.voteType || null,
      });
    } catch (error) {
      console.error("Comment vote error:", error);
      res.status(500).json({ error: "Failed to process vote" });
    }
  });

  // Department routes
  app.get("/api/departments", async (req, res) => {
    try {
      const municipality = req.query.municipality as string;
      const departments = await storage.getDepartments(municipality);
      res.json(departments);
    } catch (error) {
      console.error("Get departments error:", error);
      res.status(500).json({ error: "Failed to get departments" });
    }
  });

  app.post("/api/departments", requireAdmin, async (req, res) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      console.error("Create department error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  // Assignment routes
  app.get("/api/assignments", requireAdmin, async (req, res) => {
    try {
      const filters = {
        grievanceId: req.query.grievanceId as string,
        departmentId: req.query.departmentId as string,
        assignedTo: req.query.assignedTo as string,
        status: req.query.status as string,
      };

      const assignments = await storage.getAssignments(filters);
      res.json(assignments);
    } catch (error) {
      console.error("Get assignments error:", error);
      res.status(500).json({ error: "Failed to get assignments" });
    }
  });

  app.post("/api/assignments", requireAdmin, async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        assignedBy: req.session.userId,
      });

      const assignment = await storage.createAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Create assignment error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  app.patch("/api/assignments/:id", requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      const assignment = await storage.updateAssignment(req.params.id, updates);
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      console.error("Update assignment error:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/stats", requireAdmin, async (req, res) => {
    try {
      const municipality = req.query.municipality as string;
      const stats = await storage.getGrievanceStats(municipality);
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // User management routes for admin
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      // Note: This is a simplified implementation
      // In production, you'd want proper pagination and filtering
      res.json({ message: "User management endpoint - implement as needed" });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
