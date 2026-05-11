import { z } from 'zod';
import { isValidSolanaAddress } from '@/lib/utils';

// SOL Transfer Schema
export const sendSolSchema = z.object({
  recipientAddress: z
    .string()
    .min(1, 'Recipient address is required')
    .refine(isValidSolanaAddress, 'Invalid Solana wallet address'),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount too large'),
  memo: z.string().max(200, 'Memo too long').optional(),
});

export type SendSolFormValues = z.infer<typeof sendSolSchema>;

// Token Transfer Schema
export const sendTokenSchema = z.object({
  recipientAddress: z
    .string()
    .min(1, 'Recipient address is required')
    .refine(isValidSolanaAddress, 'Invalid Solana wallet address'),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0'),
  tokenMint: z.string().min(1, 'Token mint is required'),
});

export type SendTokenFormValues = z.infer<typeof sendTokenSchema>;

// Mint Token Schema
export const mintTokenSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0')
    .max(1000000000, 'Amount too large'),
  recipientAddress: z
    .string()
    .optional()
    .refine(
      (val) => !val || isValidSolanaAddress(val),
      'Invalid Solana wallet address'
    ),
});

export type MintTokenFormValues = z.infer<typeof mintTokenSchema>;
