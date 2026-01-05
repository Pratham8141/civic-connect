import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userTypeEnum = pgEnum('user_type', ['citizen', 'admin']);
export const grievanceStatusEnum = pgEnum('grievance_status', ['pending', 'urgent', 'in-progress', 'resolved', 'closed']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['assigned', 'in-progress', 'completed', 'escalated']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  phone: text("phone"),
  municipality: text("municipality").notNull(),
  type: userTypeEnum("type").notNull().default('citizen'),
  department: text("department"), // For admin users
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Departments table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  municipality: text("municipality").notNull(),
  headId: varchar("head_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Grievances table
export const grievances = pgTable("grievances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  municipality: text("municipality").notNull(),
  location: text("location"),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  status: grievanceStatusEnum("status").default('pending').notNull(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").references(() => grievances.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
});

// Assignments table
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").references(() => grievances.id).notNull(),
  departmentId: varchar("department_id").references(() => departments.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  status: assignmentStatusEnum("status").default('assigned').notNull(),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
});

// User votes table for tracking votes
export const userVotes = pgTable("user_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  grievanceId: varchar("grievance_id").references(() => grievances.id),
  commentId: varchar("comment_id").references(() => comments.id),
  voteType: text("vote_type").notNull(), // 'up' or 'down'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  phone: true,
  municipality: true,
  type: true,
  department: true,
});

export const insertGrievanceSchema = createInsertSchema(grievances).omit({
  id: true,
  timestamp: true,
  upvotes: true,
  downvotes: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  timestamp: true,
  upvotes: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  assignedAt: true,
  completedAt: true,
});

export const insertUserVoteSchema = createInsertSchema(userVotes).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGrievance = z.infer<typeof insertGrievanceSchema>;
export type Grievance = typeof grievances.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertUserVote = z.infer<typeof insertUserVoteSchema>;
export type UserVote = typeof userVotes.$inferSelect;
