ALTER TABLE "Credential" ADD COLUMN "allowedWorkflowIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
