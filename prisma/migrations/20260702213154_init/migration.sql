-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "PlannedMealStatus" AS ENUM ('PLANNED', 'EATEN', 'SKIPPED', 'EATING_OUT');

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealTypes" "MealSlot"[],
    "category" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "recipe" TEXT,
    "ingredients" JSONB NOT NULL DEFAULT '[]',
    "prepMinutes" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "mealId" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlannedMealStatus" NOT NULL DEFAULT 'PLANNED',
    "aiReason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlannedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "expiryDate" DATE,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingListItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "aisle" TEXT,

    CONSTRAINT "ShoppingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "PlannedMeal_date_idx" ON "PlannedMeal"("date");

-- CreateIndex
CREATE INDEX "PlannedMeal_mealId_idx" ON "PlannedMeal"("mealId");

-- CreateIndex
CREATE INDEX "ShoppingListItem_weekStart_idx" ON "ShoppingListItem"("weekStart");

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
