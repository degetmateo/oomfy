import { v7 as uuidv7 } from 'uuid';
import { CustomEmote, EmoteNameSchema, LIMITS } from '@oomfy/shared';
import { ZodError } from 'zod';
import { MongoEmoteRepository } from '../../infrastructure/repositories/mongo/MongoEmoteRepository.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { EmoteImageValidator } from '../../utils/EmoteImageValidator.js';
import { Environment } from '../../config/Environment.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';

export class EmoteService {
  public static async listEmotes(query?: string, limit = 200, creatorId?: string): Promise<CustomEmote[]> {
    return MongoEmoteRepository.search(query, limit, creatorId);
  }

  public static async createEmote(user: { id: string; username: string }, rawName: string, file?: Express.Multer.File): Promise<CustomEmote> {
    let name: string;
    try {
      name = EmoteNameSchema.parse(rawName);
    } catch (err) {
      if (err instanceof ZodError) throw new BadRequestError(err.issues.map((i) => i.message).join(' | '));
      throw err;
    }
    const userCount = await MongoEmoteRepository.countByCreatorId(user.id);
    if (userCount >= LIMITS.EMOTE_MAX_PER_USER) {
      throw new BadRequestError(`Has alcanzado el límite máximo de ${LIMITS.EMOTE_MAX_PER_USER} emotes en tu colección.`);
    }
    const validFile = EmoteImageValidator.validate(file);
    if (await MongoEmoteRepository.findByCreatorAndName(user.id, name)) {
      throw new ConflictError('Ya tienes un emote con ese nombre en tu colección.');
    }
    let imageUrl: string;
    let deleteUrl: string | null = null;
    if (Environment.IMGBB_KEY && Environment.NODE_ENV !== 'test') {
      const upload = await ImgBBStorageAdapter.upload(validFile.buffer);
      imageUrl = upload.url;
      deleteUrl = upload.delete_url;
    } else {
      imageUrl = `data:${validFile.mimetype || 'image/png'};base64,${validFile.buffer.toString('base64')}`;
    }
    return MongoEmoteRepository.create({
      id: uuidv7(), name, image_url: imageUrl, delete_url: deleteUrl,
      creator_id: user.id, creator_username: user.username, created_at: new Date().toISOString(),
    });
  }

  public static async importEmote(user: { id: string; username: string }, sourceEmoteId: string): Promise<CustomEmote> {
    if (!sourceEmoteId) throw new BadRequestError('ID de emote requerido.');
    const source = await MongoEmoteRepository.findById(sourceEmoteId);
    if (!source) throw new NotFoundError('El emote que intentas importar no existe.');
    if (source.creator_id === user.id) throw new BadRequestError('Este emote ya pertenece a tu colección.');
    const userCount = await MongoEmoteRepository.countByCreatorId(user.id);
    if (userCount >= LIMITS.EMOTE_MAX_PER_USER) {
      throw new BadRequestError(`Has alcanzado el límite máximo de ${LIMITS.EMOTE_MAX_PER_USER} emotes en tu colección.`);
    }
    if (await MongoEmoteRepository.findByCreatorAndName(user.id, source.name)) {
      throw new ConflictError(`Ya tienes un emote llamado :${source.name}: en tu colección.`);
    }
    return MongoEmoteRepository.create({
      id: uuidv7(), name: source.name, image_url: source.image_url, delete_url: null,
      creator_id: user.id, creator_username: user.username, created_at: new Date().toISOString(),
    });
  }

  public static async deleteEmote(id: string, requester: { id: string; role?: string }): Promise<void> {
    const emote = await MongoEmoteRepository.findById(id);
    if (!emote) throw new NotFoundError('Emote no encontrado.');
    const isStaff = requester.role === 'admin' || requester.role === 'mod';
    if (emote.creator_id !== requester.id && !isStaff) {
      throw new ForbiddenError('No tienes permisos para eliminar este emote.');
    }
    await MongoEmoteRepository.deleteById(id);
    if (emote.delete_url) ImgBBStorageAdapter.delete(emote.delete_url).catch(() => {});
  }
}
