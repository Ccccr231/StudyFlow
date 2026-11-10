CREATE TABLE "UserModelSetting" (
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    CONSTRAINT "UserModelSetting_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "UserModelSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
