-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user_type enum
DO $$ BEGIN
    CREATE TYPE user_type AS ENUM ('citizen', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create grievance_status enum
DO $$ BEGIN
    CREATE TYPE grievance_status AS ENUM ('pending', 'urgent', 'in-progress', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create assignment_status enum
DO $$ BEGIN
    CREATE TYPE assignment_status AS ENUM ('assigned', 'in-progress', 'completed', 'escalated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    municipality TEXT NOT NULL,
    type user_type NOT NULL DEFAULT 'citizen',
    department TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    municipality TEXT NOT NULL,
    head_id VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create grievances table
CREATE TABLE IF NOT EXISTS grievances (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    municipality TEXT NOT NULL,
    location TEXT,
    author_id VARCHAR REFERENCES users(id) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    upvotes INTEGER DEFAULT 0 NOT NULL,
    downvotes INTEGER DEFAULT 0 NOT NULL,
    status grievance_status DEFAULT 'pending' NOT NULL,
    image_url TEXT,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id VARCHAR REFERENCES grievances(id) NOT NULL,
    author_id VARCHAR REFERENCES users(id) NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    upvotes INTEGER DEFAULT 0 NOT NULL
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id VARCHAR REFERENCES grievances(id) NOT NULL,
    department_id VARCHAR REFERENCES departments(id),
    assigned_to VARCHAR REFERENCES users(id),
    assigned_by VARCHAR REFERENCES users(id) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
    status assignment_status DEFAULT 'assigned' NOT NULL,
    notes TEXT,
    completed_at TIMESTAMP
);

-- Create user_votes table with proper constraints
CREATE TABLE IF NOT EXISTS user_votes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    grievance_id VARCHAR REFERENCES grievances(id),
    comment_id VARCHAR REFERENCES comments(id),
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Ensure user can only vote once per grievance
    CONSTRAINT unique_user_grievance_vote UNIQUE (user_id, grievance_id),
    
    -- Ensure user can only vote once per comment
    CONSTRAINT unique_user_comment_vote UNIQUE (user_id, comment_id),
    
    -- Ensure vote is either for grievance or comment, not both
    CONSTRAINT vote_target_check CHECK (
        (grievance_id IS NOT NULL AND comment_id IS NULL) OR
        (grievance_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Create session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grievances_municipality ON grievances(municipality);
CREATE INDEX IF NOT EXISTS idx_grievances_category ON grievances(category);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_timestamp ON grievances(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comments_grievance ON comments(grievance_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_grievance ON user_votes(grievance_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_comment ON user_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_user ON user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_grievance ON assignments(grievance_id);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);