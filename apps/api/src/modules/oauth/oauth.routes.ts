import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  googleLoginController,
  googleCallbackController,
  githubLoginController,
  githubCallbackController,
} from './oauth.controller.js';

export const oauthRouter: Router = Router();

oauthRouter.get('/google', asyncHandler(googleLoginController));
oauthRouter.get('/google/callback', asyncHandler(googleCallbackController));

oauthRouter.get('/github', asyncHandler(githubLoginController));
oauthRouter.get('/github/callback', asyncHandler(githubCallbackController));
