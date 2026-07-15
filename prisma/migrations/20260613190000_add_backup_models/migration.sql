CREATE TABLE IF NOT EXISTS "BackupHistory" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "groups" TEXT[] NOT NULL,
    "type" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BackupSchedule" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "time" TEXT NOT NULL DEFAULT '23:00',
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "keepLast" INTEGER NOT NULL DEFAULT 10,
    "destination" TEXT NOT NULL,
    "groups" TEXT[] NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BackupSchedule_pkey" PRIMARY KEY ("id")
);
