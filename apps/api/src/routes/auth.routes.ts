import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { SignupSchema, SigninSchema } from '@oomfy/shared';

const router = Router();

router.post('/signup', ValidateRequest.body(SignupSchema), AuthController.signup);
router.post('/verify', AuthController.verify);
router.get('/verify', AuthController.verify);
router.post('/signin', ValidateRequest.body(SigninSchema), AuthController.signin);
router.post('/refresh', AuthController.refreshToken);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/forgot-username', AuthController.forgotUsername);
router.post('/logout', AuthController.logout);

export default router;

