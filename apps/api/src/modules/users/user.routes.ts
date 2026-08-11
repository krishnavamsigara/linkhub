import { Router } from 'express';

import {
  createUserController,
  deleteUserController,
  getUserController,
  updateUserController,
} from './user.controller.js';

export const userRouter: Router = Router();

userRouter.post('/', createUserController);

userRouter.get('/:id', getUserController);

userRouter.patch('/:id', updateUserController);

userRouter.delete('/:id', deleteUserController);
