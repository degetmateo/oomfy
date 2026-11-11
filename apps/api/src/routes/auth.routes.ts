import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { ValidateRequest } from '../middlewares/ValidateRequest.js';
import { createRateLimiter } from '../middlewares/RateLimiter.js';
import {
  SignupSchema,
  SigninSchema,
  VerifyAccountSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ForgotUsernameSchema,
} from '@oomfy/shared';

const router = Router();
const strictLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'auth-strict' });
const recoveryLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'auth-recovery' });
const refreshLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, prefix: 'auth-refresh' });

router.post('/signup', strictLimiter, ValidateRequest.body(SignupSchema), AuthController.signup);
router.post('/verify', strictLimiter, ValidateRequest.body(VerifyAccountSchema), AuthController.verify);
router.post('/signin', strictLimiter, ValidateRequest.body(SigninSchema), AuthController.signin);
router.post('/refresh', refreshLimiter, AuthController.refreshToken);
router.post('/refresh-token', refreshLimiter, AuthController.refreshToken);
router.post('/forgot-password', recoveryLimiter, ValidateRequest.body(ForgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', strictLimiter, ValidateRequest.body(ResetPasswordSchema), AuthController.resetPassword);
router.post('/forgot-username', recoveryLimiter, ValidateRequest.body(ForgotUsernameSchema), AuthController.forgotUsername);
router.post('/logout', AuthController.logout);

export default router;
