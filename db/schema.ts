import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const certificates = sqliteTable("certificates", {
  id: text("id").primaryKey(), name: text("name").notNull(), notes: text("notes").notNull().default(""),
  password: text("password").notNull(), enabled: integer("enabled").notNull().default(1),
  status: text("status").notNull().default("unverified"), expiresAt: text("expires_at"),
  teamId: text("team_id"), profileType: text("profile_type").notNull(), createdAt: integer("created_at").notNull(),
});
export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull() });
export const installs = sqliteTable("installs", {
  id: text("id").primaryKey(), uploadTokenHash: text("upload_token_hash").notNull(), fileKey: text("file_key").notNull(),
  uploadId: text("upload_id"),
  bundleId: text("bundle_id").notNull(), title: text("title").notNull(), version: text("version").notNull(),
  size: integer("size").notNull(), ready: integer("ready").notNull().default(0), expiresAt: integer("expires_at").notNull(),
  clientHash: text("client_hash").notNull(), createdAt: integer("created_at").notNull(),
}, t => [index("idx_installs_expiry").on(t.expiresAt), index("idx_installs_client_created").on(t.clientHash, t.createdAt)]);
