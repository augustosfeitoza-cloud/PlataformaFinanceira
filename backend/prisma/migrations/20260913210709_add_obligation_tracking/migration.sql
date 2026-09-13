-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "regime" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObligationType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recurrence" TEXT NOT NULL,
    "dueDay" INTEGER NOT NULL DEFAULT 20,
    "dueMonthOffset" INTEGER NOT NULL DEFAULT 1,
    "dueMonth" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObligationType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientObligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "obligationTypeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientObligation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientObligation_obligationTypeId_fkey" FOREIGN KEY ("obligationTypeId") REFERENCES "ObligationType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObligationCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientObligationId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "protocolNumber" TEXT,
    "notes" TEXT,
    CONSTRAINT "ObligationCompletion_clientObligationId_fkey" FOREIGN KEY ("clientObligationId") REFERENCES "ClientObligation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "ObligationType_userId_idx" ON "ObligationType"("userId");

-- CreateIndex
CREATE INDEX "ClientObligation_clientId_idx" ON "ClientObligation"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientObligation_clientId_obligationTypeId_key" ON "ClientObligation"("clientId", "obligationTypeId");

-- CreateIndex
CREATE INDEX "ObligationCompletion_clientObligationId_idx" ON "ObligationCompletion"("clientObligationId");

-- CreateIndex
CREATE UNIQUE INDEX "ObligationCompletion_clientObligationId_competence_key" ON "ObligationCompletion"("clientObligationId", "competence");
