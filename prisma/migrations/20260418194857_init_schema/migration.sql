-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'MEMBER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."MembershipStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."MembershipBillingPeriod" AS ENUM ('TRIAL', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "public"."InventoryCategory" AS ENUM ('Drink', 'Gear', 'PT');

-- CreateEnum
CREATE TYPE "public"."InventoryStockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."OtpPurpose" AS ENUM ('OWNER_SIGNUP', 'MEMBER_LOGIN');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gyms" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL,
    "total_members" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."membership_plans" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "billing_period" "public"."MembershipBillingPeriod" NOT NULL,
    "price_paise" INTEGER NOT NULL,
    "display_price" TEXT NOT NULL,
    "status" "public"."MembershipStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."memberships" (
    "id" UUID NOT NULL,
    "member_user_id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "plan_name" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "status" "public"."MembershipStatus" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "member_rank" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_sessions" (
    "id" UUID NOT NULL,
    "member_user_id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "check_in_at" TIMESTAMP(3) NOT NULL,
    "check_out_at" TIMESTAMP(3),
    "bonus_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_products" (
    "id" SERIAL NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."InventoryCategory" NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "status" "public"."InventoryStockStatus" NOT NULL,
    "show_in_app" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "gym_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "time_label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_records" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "member_user_id" UUID NOT NULL,
    "membership_id" UUID,
    "amount_paise" INTEGER NOT NULL,
    "amount_display" TEXT NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_order_id" TEXT,
    "provider_payment_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discovery_profiles" (
    "gym_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "amenities" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_profiles_pkey" PRIMARY KEY ("gym_id")
);

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "discount_percent" INTEGER NOT NULL,
    "applies_to" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_otps" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "public"."OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gym_settings" (
    "gym_id" UUID NOT NULL,
    "automatic_reminders" BOOLEAN NOT NULL DEFAULT true,
    "daily_summary_email" BOOLEAN NOT NULL DEFAULT false,
    "owner_email" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_settings_pkey" PRIMARY KEY ("gym_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "public"."users"("phone");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "gyms_owner_user_id_idx" ON "public"."gyms"("owner_user_id");

-- CreateIndex
CREATE INDEX "gyms_status_idx" ON "public"."gyms"("status");

-- CreateIndex
CREATE INDEX "gyms_created_at_idx" ON "public"."gyms"("created_at");

-- CreateIndex
CREATE INDEX "membership_plans_gym_id_idx" ON "public"."membership_plans"("gym_id");

-- CreateIndex
CREATE INDEX "membership_plans_status_idx" ON "public"."membership_plans"("status");

-- CreateIndex
CREATE INDEX "membership_plans_created_at_idx" ON "public"."membership_plans"("created_at");

-- CreateIndex
CREATE INDEX "memberships_member_user_id_idx" ON "public"."memberships"("member_user_id");

-- CreateIndex
CREATE INDEX "memberships_gym_id_idx" ON "public"."memberships"("gym_id");

-- CreateIndex
CREATE INDEX "memberships_plan_id_idx" ON "public"."memberships"("plan_id");

-- CreateIndex
CREATE INDEX "memberships_status_idx" ON "public"."memberships"("status");

-- CreateIndex
CREATE INDEX "memberships_created_at_idx" ON "public"."memberships"("created_at");

-- CreateIndex
CREATE INDEX "attendance_sessions_member_user_id_idx" ON "public"."attendance_sessions"("member_user_id");

-- CreateIndex
CREATE INDEX "attendance_sessions_gym_id_idx" ON "public"."attendance_sessions"("gym_id");

-- CreateIndex
CREATE INDEX "attendance_sessions_created_at_idx" ON "public"."attendance_sessions"("created_at");

-- CreateIndex
CREATE INDEX "inventory_products_gym_id_idx" ON "public"."inventory_products"("gym_id");

-- CreateIndex
CREATE INDEX "inventory_products_status_idx" ON "public"."inventory_products"("status");

-- CreateIndex
CREATE INDEX "inventory_products_created_at_idx" ON "public"."inventory_products"("created_at");

-- CreateIndex
CREATE INDEX "notifications_gym_id_idx" ON "public"."notifications"("gym_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "public"."notifications"("created_at");

-- CreateIndex
CREATE INDEX "payment_records_gym_id_idx" ON "public"."payment_records"("gym_id");

-- CreateIndex
CREATE INDEX "payment_records_member_user_id_idx" ON "public"."payment_records"("member_user_id");

-- CreateIndex
CREATE INDEX "payment_records_membership_id_idx" ON "public"."payment_records"("membership_id");

-- CreateIndex
CREATE INDEX "payment_records_status_idx" ON "public"."payment_records"("status");

-- CreateIndex
CREATE INDEX "payment_records_created_at_idx" ON "public"."payment_records"("created_at");

-- CreateIndex
CREATE INDEX "discovery_profiles_rank_idx" ON "public"."discovery_profiles"("rank");

-- CreateIndex
CREATE INDEX "discovery_profiles_created_at_idx" ON "public"."discovery_profiles"("created_at");

-- CreateIndex
CREATE INDEX "campaigns_gym_id_idx" ON "public"."campaigns"("gym_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "public"."campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_created_at_idx" ON "public"."campaigns"("created_at");

-- CreateIndex
CREATE INDEX "auth_otps_phone_idx" ON "public"."auth_otps"("phone");

-- CreateIndex
CREATE INDEX "auth_otps_purpose_idx" ON "public"."auth_otps"("purpose");

-- CreateIndex
CREATE INDEX "auth_otps_created_at_idx" ON "public"."auth_otps"("created_at");

-- AddForeignKey
ALTER TABLE "public"."gyms" ADD CONSTRAINT "gyms_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."membership_plans" ADD CONSTRAINT "membership_plans_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_sessions" ADD CONSTRAINT "attendance_sessions_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_sessions" ADD CONSTRAINT "attendance_sessions_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_products" ADD CONSTRAINT "inventory_products_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_records" ADD CONSTRAINT "payment_records_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_records" ADD CONSTRAINT "payment_records_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_records" ADD CONSTRAINT "payment_records_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discovery_profiles" ADD CONSTRAINT "discovery_profiles_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gym_settings" ADD CONSTRAINT "gym_settings_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
