ALTER TABLE "User" ADD COLUMN "calendarToken" TEXT;
CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");

CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "slackNotifyLead" BOOLEAN NOT NULL DEFAULT true,
    "slackNotifyStage" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);
