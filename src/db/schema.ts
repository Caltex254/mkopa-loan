// Drizzle ORM schema for Mkopa Loan (R2-backed KYC flow).
//
// The existing app uses Prisma as its primary ORM (see /prisma/schema.prisma).
// This Drizzle schema exposes the same `kyc_documents` table concept with
// explicit R2 object key columns, so the new R2-backed upload flow can use
// Drizzle without conflicting with Prisma's generated client.
//
// Tables here mirror the existing Prisma schema — Drizzle is added as an
// optional query layer. To use exclusively Drizzle, drop the Prisma client
// imports and remove the `@prisma/client` dependency.

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

export const kycStatusEnum = pgEnum('kyc_status', [
  'pending',
  'approved',
  'rejected',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone').notNull(),
    nationalId: text('national_id').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
  })
);

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'),
    role: text('role').notNull().default('admin'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// KYC documents — references R2 object keys, not raw image bytes.
export const kycDocuments = pgTable(
  'kyc_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    legalName: text('legal_name').notNull(),
    nationalId: text('national_id').notNull(),
    residentialAddress: text('residential_address'),
    dateOfBirth: text('date_of_birth'),

    // R2 object keys for front and back of ID card.
    // Example: kyc/{userId}/{uuid}-front.jpg
    idFrontKey: text('id_front_key'),
    idBackKey: text('id_back_key'),

    status: kycStatusEnum('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by'),
    reviewNote: text('review_note'),
    approvedLoanLimit: decimal('approved_loan_limit', { precision: 12, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('kyc_documents_user_idx').on(t.userId),
    statusIdx: index('kyc_documents_status_idx').on(t.status),
  })
);

export type User = typeof users.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type NewKycDocument = typeof kycDocuments.$inferInsert;
