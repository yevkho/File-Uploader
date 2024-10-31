-- CreateTable
CREATE TABLE "SharedFolder" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "folderId" INTEGER NOT NULL,

    CONSTRAINT "SharedFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedFolder_uuid_key" ON "SharedFolder"("uuid");

-- AddForeignKey
ALTER TABLE "SharedFolder" ADD CONSTRAINT "SharedFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
