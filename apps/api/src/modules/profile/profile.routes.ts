import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { profileController } from './profile.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const profileRouter: Router = Router();

profileRouter.get('/me', requireAuth, (req, res, next) =>
  profileController.getProfile(req, res, next),
);

profileRouter.patch('/me', requireAuth, (req, res, next) =>
  profileController.updateProfile(req, res, next),
);

profileRouter.post(
  '/me/avatar',
  requireAuth,
  upload.single('avatar'),
  (req, res, next) => profileController.uploadAvatar(req, res, next),
);

profileRouter.delete('/me/avatar', requireAuth, (req, res, next) =>
  profileController.deleteAvatar(req, res, next),
);

profileRouter.get('/public/:username', (req, res, next) =>
  profileController.getPublicProfile(req, res, next),
);

profileRouter.get('/:userId/avatar', (req, res, next) =>
  profileController.getAvatarStream(req, res, next),
);
