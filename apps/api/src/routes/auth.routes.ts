import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { SignupSchema, SigninSchema } from '@oomfy/shared';

const router = Router();

router.post('/signup', ValidateRequest.body(SignupSchema), AuthController.signup);
router.post('/verify', AuthController.verify);
router.get('/verify', AuthController.verify);
router.post('/signin', ValidateRequest.body(SigninSchema), AuthController.signin);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;

