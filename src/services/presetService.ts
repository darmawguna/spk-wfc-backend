import { AppError } from "../middleware/error.js";
import { validateWeightSet, WeightEntry } from "./weightValidator.js";
import * as presetRepository from "../repositories/presetRepository.js";
import prisma from "../lib/prisma.js";

export interface CreatePresetInput {
  name: string;
  description?: string;
  weights: WeightEntry[];
}

export interface UpdatePresetInput {
  name?: string;
  description?: string;
  weights?: WeightEntry[];
}

const NAME_REGEX = /^[a-zA-Z0-9\s\-_]+$/;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Validates the preset name format.
 * Throws AppError(422) if invalid.
 */
function validateName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new AppError(422, "Nama preset tidak boleh kosong");
  }

  if (name.length > NAME_MAX_LENGTH) {
    throw new AppError(
      422,
      `Nama preset maksimal ${NAME_MAX_LENGTH} karakter`
    );
  }

  if (!NAME_REGEX.test(name)) {
    throw new AppError(
      422,
      "Nama hanya boleh berisi huruf, angka, spasi, dash, underscore"
    );
  }
}

/**
 * Validates the preset description.
 * Throws AppError(422) if too long.
 */
function validateDescription(description: string): void {
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new AppError(
      422,
      `Deskripsi preset maksimal ${DESCRIPTION_MAX_LENGTH} karakter`
    );
  }
}

/**
 * Checks that the given name is unique (case-insensitive), excluding a preset with the given id.
 */
async function checkNameUniqueness(
  name: string,
  excludeId?: number
): Promise<void> {
  const existing = await presetRepository.findByName(name);
  if (existing && existing.id !== excludeId) {
    throw new AppError(422, `Nama preset '${name}' sudah digunakan`);
  }
}

/**
 * Loads all existing criteria IDs from the database.
 */
async function loadExistingCriteria(): Promise<{ id: number }[]> {
  return prisma.criteria.findMany({ select: { id: true } });
}

/**
 * Creates a new weight preset.
 */
export async function createPreset(input: CreatePresetInput) {
  // Validate name
  validateName(input.name);

  // Validate description if provided
  if (input.description !== undefined) {
    validateDescription(input.description);
  }

  // Check name uniqueness (case-insensitive)
  await checkNameUniqueness(input.name);

  // Validate weight set against existing criteria
  const existingCriteria = await loadExistingCriteria();
  validateWeightSet(input.weights, existingCriteria);

  // Persist via repository
  return presetRepository.create({
    name: input.name,
    description: input.description,
    weights: input.weights,
  });
}

/**
 * Updates an existing weight preset.
 */
export async function updatePreset(id: number, input: UpdatePresetInput) {
  // Check preset exists
  const existing = await presetRepository.findById(id);
  if (!existing) {
    throw new AppError(404, "Preset tidak ditemukan");
  }

  // Validate name if provided
  if (input.name !== undefined) {
    validateName(input.name);

    // Check uniqueness only if name is changing
    if (input.name.toLowerCase() !== existing.name.toLowerCase()) {
      await checkNameUniqueness(input.name, id);
    }
  }

  // Validate description if provided
  if (input.description !== undefined) {
    validateDescription(input.description);
  }

  // Validate weight set if provided
  if (input.weights !== undefined) {
    const existingCriteria = await loadExistingCriteria();
    validateWeightSet(input.weights, existingCriteria);
  }

  // Update via repository
  return presetRepository.update(id, {
    name: input.name,
    description: input.description,
    weights: input.weights,
  });
}

/**
 * Deletes a weight preset.
 */
export async function deletePreset(id: number) {
  // Check preset exists
  const existing = await presetRepository.findById(id);
  if (!existing) {
    throw new AppError(404, "Preset tidak ditemukan");
  }

  return presetRepository.remove(id);
}

/**
 * Lists all weight presets.
 */
export async function listPresets() {
  return presetRepository.findAll();
}

/**
 * Gets a weight preset by ID.
 * Throws 404 if not found.
 */
export async function getPresetById(id: number) {
  const preset = await presetRepository.findById(id);
  if (!preset) {
    throw new AppError(404, "Preset tidak ditemukan");
  }
  return preset;
}
