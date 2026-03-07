import { z } from "zod";
import { UserRole, PlayerType, GameType, PaymentMethod, PaymentStatus, TransactionType, ConfirmationStatus, BillingType } from "@prisma/client";

// Helper para validar CPF
const cpfSchema = z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos");

// Helper para validar email
const emailSchema = z.string().email("Email inválido").max(255);

// Helper para validar IDs (Prisma usa cuid; manter compatibilidade com UUID)
const uuidSchema = z.union([
  z.string().cuid("ID inválido"),
  z.string().uuid("ID inválido"),
]);

// Helper para validar mês de referência (YYYY-MM)
const monthSchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "Mês deve estar no formato YYYY-MM");

// Helper para validar hora (HH:mm)
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora deve estar no formato HH:mm");

// ============ USER SCHEMAS ============
export const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: emailSchema,
  phone: z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos").optional(),
  document: cpfSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  playerType: z.nativeEnum(PlayerType).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\d{10,11}$/).optional(),
  document: cpfSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  playerType: z.nativeEnum(PlayerType).optional(),
  isActive: z.boolean().optional(),
});

// ============ GAME SCHEMAS ============
export const createGameSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(200),
  description: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  startTime: timeSchema,
  endTime: timeSchema,
  gameType: z.nativeEnum(GameType),
  maxPlayers: z.number().int().min(2).max(50).default(22),
  pricePerPlayer: z.number().positive().max(10000),
  priceGoalkeeper: z.number().min(0).max(10000).default(0),
  venueId: uuidSchema,
  billingType: z.nativeEnum(BillingType).default("SINGLE"),
  isRecurring: z.boolean().optional(),
});

export const updateGameSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  gameType: z.nativeEnum(GameType).optional(),
  maxPlayers: z.number().int().min(2).max(50).optional(),
  pricePerPlayer: z.number().positive().max(10000).optional(),
  priceGoalkeeper: z.number().min(0).max(10000).optional(),
  venueId: uuidSchema.optional(),
  isActive: z.boolean().optional(),
});

// ============ GAME CONFIRMATION SCHEMAS ============
export const confirmGameSchema = z.object({
  status: z.nativeEnum(ConfirmationStatus),
  guestName: z.string().min(2).max(100).optional(),
});

// ============ PAYMENT SCHEMAS ============
export const createPaymentSchema = z.object({
  amount: z.number().positive().max(10000),
  method: z.nativeEnum(PaymentMethod),
  userId: uuidSchema.optional(),
  gameId: uuidSchema.optional(),
  referenceMonth: monthSchema.optional(),
  notes: z.string().max(500).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
});

export const createPixPaymentSchema = z.object({
  amount: z.number().positive().max(10000),
  gameId: uuidSchema.optional(),
  referenceMonth: monthSchema.optional(),
  document: cpfSchema,
});

export const createCardPaymentSchema = z.object({
  amount: z.number().positive().max(10000),
  gameId: uuidSchema.optional(),
  referenceMonth: monthSchema.optional(),
  document: cpfSchema,
  cardToken: z.string().min(10).max(1000),
  installments: z.number().int().min(1).max(12).default(1),
});

// ============ TRANSACTION SCHEMAS ============
export const createTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive().max(100000),
  description: z.string().min(2).max(500),
  category: z.string().max(100).optional(),
  date: z.string().datetime().optional(),
  gameId: uuidSchema.optional(),
});

// ============ VENUE SCHEMAS ============
export const createVenueSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
  googleMapsLink: z.string().url().max(500).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(50),
  zipCode: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos").optional(),
  phone: z.string().regex(/^\d{10,11}$/).optional(),
  pricePerHour: z.number().positive().optional(),
  gameType: z.nativeEnum(GameType),
  capacity: z.number().int().min(2).max(100).default(22),
});

// ============ SETTINGS SCHEMAS ============
export const updateSettingsSchema = z.object({
  whatsappGroupId: z.string().max(100).optional(),
  pixKey: z.string().max(100).optional(),
  monthlyFee: z.number().positive().max(10000).optional(),
  creditCardFee: z.number().min(0).max(100).optional(),
  defaultCpf: cpfSchema.optional(),
  enableReminder2Days: z.boolean().optional(),
  enableReminder1Day: z.boolean().optional(),
  enableFinalList: z.boolean().optional(),
  enableDebtors: z.boolean().optional(),
});

// ============ QUERY PARAMS SCHEMAS ============
export const paymentQuerySchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  userId: uuidSchema.optional(),
  gameId: uuidSchema.optional(),
  month: monthSchema.optional(),
});

export const gameQuerySchema = z.object({
  upcoming: z.enum(["true", "false"]).optional(),
});

export const userQuerySchema = z.object({
  playerType: z.nativeEnum(PlayerType).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export const transactionQuerySchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============ WEBHOOK SCHEMAS ============
export const pagseguroWebhookSchema = z.object({
  id: z.string(),
  reference_id: z.string(),
  charges: z.array(z.object({
    id: z.string(),
    status: z.enum(["AUTHORIZED", "PAID", "AVAILABLE", "IN_ANALYSIS", "DECLINED", "CANCELED", "REFUNDED"]),
    amount: z.object({
      value: z.number(),
      currency: z.string(),
    }),
  })).min(1),
});

// ============ CRON SCHEMAS ============
export const cronJobSchema = z.object({
  key: z.string(),
});

// Types exportados
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreatePixPaymentInput = z.infer<typeof createPixPaymentSchema>;
export type CreateCardPaymentInput = z.infer<typeof createCardPaymentSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type ConfirmGameInput = z.infer<typeof confirmGameSchema>;
