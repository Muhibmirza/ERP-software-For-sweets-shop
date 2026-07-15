import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAdvanceEntry } from '../services/journalService';

export const getAdvances = async (_req: AuthRequest, res: Response) => {
  const advances = await prisma.employeeAdvance.findMany({
    include: { employee: true, creator: { select: { name: true } } },
    orderBy: { advanceDate: 'desc' }
  });
  res.json({ success: true, data: advances });
};

export const getEmployeeAdvances = async (req: AuthRequest, res: Response) => {
  const advances = await prisma.employeeAdvance.findMany({
    where: { employeeId: req.params.employeeId },
    include: { employee: true },
    orderBy: { advanceDate: 'desc' }
  });
  res.json({ success: true, data: advances });
};

export const createAdvance = async (req: AuthRequest, res: Response) => {
  const { employeeId, amount, reason, date, advanceDate } = req.body;
  const advanceAmount = Number(amount || 0);
  const advance = await prisma.$transaction(async (tx) => {
    const created = await tx.employeeAdvance.create({
      data: {
        employeeId,
        amount: advanceAmount,
        reason,
        date: date ? new Date(date) : (advanceDate ? new Date(advanceDate) : new Date()),
        advanceDate: advanceDate ? new Date(advanceDate) : (date ? new Date(date) : new Date()),
        deductedAmount: 0,
        remainingBalance: advanceAmount,
        createdBy: req.user!.id
      },
      include: { employee: true, creator: { select: { name: true } } }
    });
    await createAdvanceEntry(employeeId, created.id, advanceAmount, tx);
    return created;
  });
  res.status(201).json({ success: true, data: advance });
};

export const recoverAdvance = async (req: AuthRequest, res: Response) => {
  const { recoveredAmount, amount } = req.body;
  const current = await prisma.employeeAdvance.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ success: false, message: 'Advance not found' });
  const nextDeducted = amount !== undefined ? (current.deductedAmount || 0) + Number(amount) : Number(recoveredAmount || current.amount);
  const nextRemaining = Math.max(0, current.amount - nextDeducted);
  const advance = await prisma.employeeAdvance.update({
    where: { id: req.params.id },
    data: {
      recoveredAmount: nextDeducted,
      deductedAmount: nextDeducted,
      remainingBalance: nextRemaining,
      isRecovered: nextRemaining <= 0,
      isFullyRecovered: nextRemaining <= 0
    },
    include: { employee: true }
  });
  res.json({ success: true, data: advance });
};
