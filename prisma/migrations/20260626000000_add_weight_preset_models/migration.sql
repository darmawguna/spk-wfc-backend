-- CreateTable
CREATE TABLE "WeightPreset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresetWeight" (
    "id" SERIAL NOT NULL,
    "presetId" INTEGER NOT NULL,
    "criteriaId" INTEGER NOT NULL,
    "bobot" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PresetWeight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeightPreset_name_key" ON "WeightPreset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PresetWeight_presetId_criteriaId_key" ON "PresetWeight"("presetId", "criteriaId");

-- AddForeignKey
ALTER TABLE "PresetWeight" ADD CONSTRAINT "PresetWeight_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "WeightPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresetWeight" ADD CONSTRAINT "PresetWeight_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "Criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
