import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, asc, and, sql, count } from "drizzle-orm";
import {
  type User,
  type InsertUser,
  type Grievance,
  type InsertGrievance,
  type Comment,
  type InsertComment,
  type Department,
  type InsertDepartment,
  type Assignment,
  type InsertAssignment,
  type UserVote,
  type InsertUserVote,
  users,
  grievances,
  comments,
  departments,
  assignments,
  userVotes,
} from "@shared/schema";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const db = drizzle(pool);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Grievance operations
  getGrievances(filters?: {
    category?: string;
    municipality?: string;
    status?: string;
    authorId?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ grievances: (Grievance & { authorUsername: string })[], total: number }>;
  getGrievance(id: string): Promise<(Grievance & { authorUsername: string }) | undefined>;
  createGrievance(grievance: InsertGrievance): Promise<Grievance>;
  updateGrievance(id: string, updates: Partial<Grievance>): Promise<Grievance | undefined>;
  deleteGrievance(id: string): Promise<boolean>;
  
  // Comment operations
  getComments(grievanceId: string): Promise<(Comment & { authorUsername: string })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, text: string): Promise<Comment | undefined>;
  deleteComment(id: string): Promise<boolean>;
  
  // Voting operations
  getUserVote(userId: string, grievanceId?: string, commentId?: string): Promise<UserVote | undefined>;
  createOrUpdateVote(vote: InsertUserVote): Promise<UserVote>;
  removeVote(userId: string, grievanceId?: string, commentId?: string): Promise<boolean>;
  updateVoteCounts(grievanceId?: string, commentId?: string): Promise<void>;
  
  // Department operations
  getDepartments(municipality?: string): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  
  // Assignment operations
  getAssignments(filters?: {
    grievanceId?: string;
    departmentId?: string;
    assignedTo?: string;
    status?: string;
  }): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment | undefined>;
  
  // Analytics operations
  getGrievanceStats(municipality?: string): Promise<{
    total: number;
    pending: number;
    urgent: number;
    inProgress: number;
    resolved: number;
  }>;
}

export class PostgreSQLStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Grievance operations
  async getGrievances(filters: {
    category?: string;
    municipality?: string;
    status?: string;
    authorId?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ grievances: (Grievance & { authorUsername: string })[], total: number }> {
    let query = db
      .select({
        id: grievances.id,
        title: grievances.title,
        description: grievances.description,
        category: grievances.category,
        municipality: grievances.municipality,
        location: grievances.location,
        authorId: grievances.authorId,
        timestamp: grievances.timestamp,
        upvotes: grievances.upvotes,
        downvotes: grievances.downvotes,
        status: grievances.status,
        imageUrl: grievances.imageUrl,
        updatedAt: grievances.updatedAt,
        authorUsername: users.username,
      })
      .from(grievances)
      .leftJoin(users, eq(grievances.authorId, users.id));

    // Apply filters
    const conditions = [];
    
    if (filters.category && filters.category !== 'all') {
      conditions.push(eq(grievances.category, filters.category));
    }
    
    if (filters.municipality && filters.municipality !== 'all') {
      conditions.push(eq(grievances.municipality, filters.municipality));
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(grievances.status, filters.status as any));
    }
    
    if (filters.authorId) {
      conditions.push(eq(grievances.authorId, filters.authorId));
    }
    
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        sql`(${grievances.title} ILIKE ${searchTerm} OR ${grievances.description} ILIKE ${searchTerm} OR ${grievances.location} ILIKE ${searchTerm})`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'oldest':
        query = query.orderBy(asc(grievances.timestamp));
        break;
      case 'upvotes-high':
        query = query.orderBy(desc(sql`${grievances.upvotes} - ${grievances.downvotes}`));
        break;
      case 'upvotes-low':
        query = query.orderBy(asc(sql`${grievances.upvotes} - ${grievances.downvotes}`));
        break;
      case 'urgent':
        query = query.orderBy(
          sql`CASE WHEN ${grievances.status} = 'urgent' THEN 0 ELSE 1 END`,
          desc(grievances.timestamp)
        );
        break;
      default: // newest
        query = query.orderBy(desc(grievances.timestamp));
    }

    // Get total count
    let countQuery = db.select({ count: count() }).from(grievances);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const totalResult = await countQuery;
    const total = totalResult[0].count;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const result = await query;
    return { grievances: result, total };
  }

  async getGrievance(id: string): Promise<(Grievance & { authorUsername: string }) | undefined> {
    const result = await db
      .select({
        id: grievances.id,
        title: grievances.title,
        description: grievances.description,
        category: grievances.category,
        municipality: grievances.municipality,
        location: grievances.location,
        authorId: grievances.authorId,
        timestamp: grievances.timestamp,
        upvotes: grievances.upvotes,
        downvotes: grievances.downvotes,
        status: grievances.status,
        imageUrl: grievances.imageUrl,
        updatedAt: grievances.updatedAt,
        authorUsername: users.username,
      })
      .from(grievances)
      .leftJoin(users, eq(grievances.authorId, users.id))
      .where(eq(grievances.id, id))
      .limit(1);
    return result[0];
  }

  async createGrievance(grievance: InsertGrievance): Promise<Grievance> {
    const result = await db.insert(grievances).values(grievance).returning();
    return result[0];
  }

  async updateGrievance(id: string, updates: Partial<Grievance>): Promise<Grievance | undefined> {
    const result = await db
      .update(grievances)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(grievances.id, id))
      .returning();
    return result[0];
  }

  async deleteGrievance(id: string): Promise<boolean> {
    const result = await db.delete(grievances).where(eq(grievances.id, id));
    return result.rowCount > 0;
  }

  // Comment operations
  async getComments(grievanceId: string): Promise<(Comment & { authorUsername: string })[]> {
    const result = await db
      .select({
        id: comments.id,
        grievanceId: comments.grievanceId,
        authorId: comments.authorId,
        text: comments.text,
        timestamp: comments.timestamp,
        upvotes: comments.upvotes,
        authorUsername: users.username,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.grievanceId, grievanceId))
      .orderBy(desc(comments.timestamp));
    return result;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values(comment).returning();
    return result[0];
  }

  async updateComment(id: string, text: string): Promise<Comment | undefined> {
    const result = await db
      .update(comments)
      .set({ text })
      .where(eq(comments.id, id))
      .returning();
    return result[0];
  }

  async deleteComment(id: string): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.rowCount > 0;
  }

  // Voting operations
  async getUserVote(userId: string, grievanceId?: string, commentId?: string): Promise<UserVote | undefined> {
    const conditions = [eq(userVotes.userId, userId)];
    
    if (grievanceId) {
      conditions.push(eq(userVotes.grievanceId, grievanceId));
    }
    
    if (commentId) {
      conditions.push(eq(userVotes.commentId, commentId));
    }

    const result = await db
      .select()
      .from(userVotes)
      .where(and(...conditions))
      .limit(1);
    return result[0];
  }

  async createOrUpdateVote(vote: InsertUserVote): Promise<UserVote> {
    // Use database-level upsert to prevent race conditions
    try {
      // Try to insert first
      const result = await db.insert(userVotes).values(vote).returning();
      return result[0];
    } catch (error: any) {
      // If constraint violation (duplicate vote), update existing
      if (error.code === '23505') { // unique_violation
        const result = await db
          .update(userVotes)
          .set({ voteType: vote.voteType, timestamp: new Date() })
          .where(
            and(
              eq(userVotes.userId, vote.userId),
              vote.grievanceId 
                ? eq(userVotes.grievanceId, vote.grievanceId)
                : eq(userVotes.commentId, vote.commentId!)
            )
          )
          .returning();
        return result[0];
      }
      throw error;
    }
  }

  async removeVote(userId: string, grievanceId?: string, commentId?: string): Promise<boolean> {
    const conditions = [eq(userVotes.userId, userId)];
    
    if (grievanceId) {
      conditions.push(eq(userVotes.grievanceId, grievanceId));
    }
    
    if (commentId) {
      conditions.push(eq(userVotes.commentId, commentId));
    }

    const result = await db.delete(userVotes).where(and(...conditions));
    return result.rowCount > 0;
  }

  async updateVoteCounts(grievanceId?: string, commentId?: string): Promise<void> {
    if (grievanceId) {
      // Update grievance vote counts
      const upvotesResult = await db
        .select({ count: count() })
        .from(userVotes)
        .where(and(eq(userVotes.grievanceId, grievanceId), eq(userVotes.voteType, 'up')));
      
      const downvotesResult = await db
        .select({ count: count() })
        .from(userVotes)
        .where(and(eq(userVotes.grievanceId, grievanceId), eq(userVotes.voteType, 'down')));
      
      await db
        .update(grievances)
        .set({
          upvotes: upvotesResult[0].count,
          downvotes: downvotesResult[0].count,
        })
        .where(eq(grievances.id, grievanceId));
    }
    
    if (commentId) {
      // Update comment vote counts
      const upvotesResult = await db
        .select({ count: count() })
        .from(userVotes)
        .where(and(eq(userVotes.commentId, commentId), eq(userVotes.voteType, 'up')));
      
      await db
        .update(comments)
        .set({ upvotes: upvotesResult[0].count })
        .where(eq(comments.id, commentId));
    }
  }

  // Department operations
  async getDepartments(municipality?: string): Promise<Department[]> {
    let query = db.select().from(departments);
    
    if (municipality) {
      query = query.where(eq(departments.municipality, municipality));
    }
    
    return await query.orderBy(departments.name);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const result = await db.insert(departments).values(department).returning();
    return result[0];
  }

  // Assignment operations
  async getAssignments(filters: {
    grievanceId?: string;
    departmentId?: string;
    assignedTo?: string;
    status?: string;
  } = {}): Promise<Assignment[]> {
    let query = db.select().from(assignments);
    
    const conditions = [];
    
    if (filters.grievanceId) {
      conditions.push(eq(assignments.grievanceId, filters.grievanceId));
    }
    
    if (filters.departmentId) {
      conditions.push(eq(assignments.departmentId, filters.departmentId));
    }
    
    if (filters.assignedTo) {
      conditions.push(eq(assignments.assignedTo, filters.assignedTo));
    }
    
    if (filters.status) {
      conditions.push(eq(assignments.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(assignments.assignedAt));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const result = await db.insert(assignments).values(assignment).returning();
    return result[0];
  }

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment | undefined> {
    const result = await db
      .update(assignments)
      .set(updates)
      .where(eq(assignments.id, id))
      .returning();
    return result[0];
  }

  // Analytics operations
  async getGrievanceStats(municipality?: string): Promise<{
    total: number;
    pending: number;
    urgent: number;
    inProgress: number;
    resolved: number;
  }> {
    let query = db
      .select({
        status: grievances.status,
        count: count(),
      })
      .from(grievances);
    
    if (municipality) {
      query = query.where(eq(grievances.municipality, municipality));
    }
    
    const result = await query.groupBy(grievances.status);
    
    const stats = {
      total: 0,
      pending: 0,
      urgent: 0,
      inProgress: 0,
      resolved: 0,
    };
    
    result.forEach(row => {
      stats.total += row.count;
      switch (row.status) {
        case 'pending':
          stats.pending = row.count;
          break;
        case 'urgent':
          stats.urgent = row.count;
          break;
        case 'in-progress':
          stats.inProgress = row.count;
          break;
        case 'resolved':
          stats.resolved = row.count;
          break;
      }
    });
    
    return stats;
  }
}

export const storage = new PostgreSQLStorage();
