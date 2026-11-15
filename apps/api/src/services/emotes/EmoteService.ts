import { v7 as uuidv7 } from 'uuid';
import { CustomEmote, EmoteNameSchema, LIMITS } from '@oomfy/shared';
import { ZodError } from 'zod';
import { MongoEmoteRepository } from '../../infrastructure/repositories/mongo/MongoEmoteRepository.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { EmoteImageValidator } from '../../utils/EmoteImageValidator.js';
import { Environment } from '../../config/Environment.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';

export class EmoteService {
  public static async listEmotes(query?: string, limit = 100): Promise<CustomEmote[]> {
    return MongoEmoteRepository.search(query, limit);
  }

  public static async createEmote(
    user: { id: string; username: string },
    rawName: string,
    file?: Express.Multer.File
  ): Promise<CustomEmote> {
    let name: string;
    try {
      name = EmoteNameSchema.parse(rawName);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestError(err.issues.map((i) => i.message).join(' | '));
      }
      throw err;
    }

    const userCount = await MongoEmoteRepository.countByCreatorId(user.id);
    if (userCount >= LIMITS.EMOTE_MAX_PER_USER) {
      throw new BadRequestError(`Has alcanzado el límite máximo de ${LIMITS.EMOTE_MAX_PER_USER} emotes personalizados.`);
    }

    const validFile = EmoteImageValidator.validate(file);
    const existing = await MongoEmoteRepository.findByName(name);
    if (existing) {
      throw new ConflictError('Ya existe un emote con ese nombre.');
    }

    let imageUrl: string;
    let deleteUrl: string | null = null;
    if (Environment.IMGBB_KEY && Environment.NODE_ENV !== 'test') {
      const upload = await ImgBBStorageAdapter.upload(validFile.buffer);
      imageUrl = upload.url;
      deleteUrl = upload.delete_url;
    } else {
      const mime = validFile.mimetype || 'image/png';
      imageUrl = `data:${mime};base64,${validFile.buffer.toString('base64')}`;
    }

    return MongoEmoteRepository.create({
      id: uuidv7(),
      name,
      image_url: imageUrl,
      delete_url: deleteUrl,
      creator_id: user.id,
      creator_username: user.username,
      created_at: new Date().toISOString(),
    });
  }

  public static async deleteEmote(id: string, requester: { id: string; role?: string }): Promise<void> {
    const emote = await MongoEmoteRepository.findById(id);
    if (!emote) {
      throw new NotFoundError('Emote no encontrado.');
    }
    const isStaff = requester.role === 'admin' || requester.role === 'mod';
    if (emote.creator_id !== requester.id && !isStaff) {
      throw new ForbiddenError('No tienes permisos para eliminar este emote.');
    }
    await MongoEmoteRepository.deleteById(id);
    if (emote.delete_url) {
      ImgBBStorageAdapter.delete(emote.delete_url).catch(() => {});
    }
  }
}
