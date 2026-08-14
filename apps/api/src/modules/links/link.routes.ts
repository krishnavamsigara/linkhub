import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { linkController } from './link.controller.js';

export const linkRouter: Router = Router();

linkRouter.post('/', requireAuth, (req, res, next) =>
  linkController.createLink(req, res, next),
);

linkRouter.get('/', requireAuth, (req, res, next) =>
  linkController.getLinks(req, res, next),
);

linkRouter.get('/redirect/:shortCode', (req, res, next) =>
  linkController.handleRedirect(req, res, next),
);

linkRouter.get('/:id/analytics', requireAuth, (req, res, next) =>
  linkController.getLinkAnalytics(req, res, next),
);

linkRouter.get('/:id', requireAuth, (req, res, next) =>
  linkController.getLinkById(req, res, next),
);

linkRouter.patch('/:id', requireAuth, (req, res, next) =>
  linkController.updateLink(req, res, next),
);

linkRouter.delete('/:id', requireAuth, (req, res, next) =>
  linkController.deleteLink(req, res, next),
);
