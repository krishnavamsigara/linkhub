import type { RequestHandler } from 'express';

import {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
  type UserParams,
} from './user.schema.js';

import { userService } from './user.service.js';

export const createUserController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const input = createUserSchema.parse(req.body);

    const user = await userService.createUser(input);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserController: RequestHandler<UserParams> = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = userParamsSchema.parse(req.params);

    const user = await userService.getUserById(id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserController: RequestHandler<UserParams> = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = userParamsSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);

    const user = await userService.updateUser(id, input);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserController: RequestHandler<UserParams> = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = userParamsSchema.parse(req.params);

    await userService.deleteUser(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
