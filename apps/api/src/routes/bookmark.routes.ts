import { Router } from 'express';
import {
  BookmarkListQuerySchema,
  CreateBookmarkFolderSchema,
  CreateBookmarkSchema,
  EntityIdParamSchema,
  MoveBookmarkSchema,
  ReorderBookmarksSchema,
  UpdateBookmarkFolderSchema,
} from '@oomfy/shared';
import { BookmarkController } from '../controllers/BookmarkController.js';
import { AuthGuard } from '../middlewares/AuthGuard.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';

const router = Router();
const bookmarkWriteLimiter = createRateLimiter({ windowMs: 60_000, max: 90, prefix: 'bookmarks-write' });

router.use(AuthGuard.requireAuth);

router.get('/folders', BookmarkController.listFolders);
router.post('/folders', bookmarkWriteLimiter, ValidateRequest.body(CreateBookmarkFolderSchema), BookmarkController.createFolder);
router.patch('/folders/:id', bookmarkWriteLimiter, ValidateRequest.params(EntityIdParamSchema), ValidateRequest.body(UpdateBookmarkFolderSchema), BookmarkController.renameFolder);
router.delete('/folders/:id', bookmarkWriteLimiter, ValidateRequest.params(EntityIdParamSchema), BookmarkController.deleteFolder);

router.put('/reorder', bookmarkWriteLimiter, ValidateRequest.body(ReorderBookmarksSchema), BookmarkController.reorderBookmarks);
router.get('/', ValidateRequest.query(BookmarkListQuerySchema), BookmarkController.listBookmarks);
router.post('/', bookmarkWriteLimiter, ValidateRequest.body(CreateBookmarkSchema), BookmarkController.saveBookmark);
router.patch('/:id/folder', bookmarkWriteLimiter, ValidateRequest.params(EntityIdParamSchema), ValidateRequest.body(MoveBookmarkSchema), BookmarkController.moveBookmark);
router.delete('/:id', bookmarkWriteLimiter, ValidateRequest.params(EntityIdParamSchema), BookmarkController.removeBookmark);

export default router;
