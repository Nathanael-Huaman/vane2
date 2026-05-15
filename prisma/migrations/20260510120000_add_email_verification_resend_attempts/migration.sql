-- CreateTable
CREATE TABLE "email_verification_resend_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_resend_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "email_verification_resend_attempts_userId_createdAt_idx" ON "email_verification_resend_attempts"("userId", "createdAt");

