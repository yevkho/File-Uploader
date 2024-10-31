/*
  Warnings:

  - Added the required column `content` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "content" BYTEA NOT NULL,
ALTER COLUMN "path" DROP NOT NULL;
