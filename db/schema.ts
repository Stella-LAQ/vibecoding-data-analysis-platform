import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  json,
  int,
} from "drizzle-orm/mysql-core";

// Data upload session table - records user uploaded files and analysis sessions
export const dataSessions = mysqlTable("data_sessions", {
  id: serial("id").primaryKey(),
  sessionKey: varchar("session_key", { length: 64 }).notNull().unique(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: int("file_size").notNull(),
  rowCount: int("row_count").default(0),
  colCount: int("col_count").default(0),
  columns: json("columns").$type<string[]>(),
  // Cleaning status
  cleanStatus: varchar("clean_status", { length: 20 }).default("pending"),
  cleanLog: text("clean_log"),
  // Stats status
  statsStatus: varchar("stats_status", { length: 20 }).default("pending"),
  // Prediction status
  predictStatus: varchar("predict_status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// Analysis task record table
export const analysisTasks = mysqlTable("analysis_tasks", {
  id: serial("id").primaryKey(),
  sessionId: int("session_id").notNull(),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("running"),
  result: json("result").$type<Record<string, unknown>>(),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});
