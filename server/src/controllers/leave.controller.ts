import { Response } from 'express';
import dayjs from 'dayjs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getLeaveRequests = async (_req: AuthRequest, res: Response) => {
  const leaves = await prisma.leaveRequest.findMany({
    include: { employee: true, approver: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: leaves });
};

export const getLeaveRequest = async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: req.params.id },
    include: { employee: true, approver: { select: { name: true } } }
  });
  if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
  res.json({ success: true, data: leave });
};

export const createLeaveRequest = async (req: AuthRequest, res: Response) => {
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;
  const totalDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  const leave = await prisma.leaveRequest.create({
    data: { employeeId, leaveType, startDate: new Date(startDate), endDate: new Date(endDate), totalDays, reason },
    include: { employee: true }
  });
  res.status(201).json({ success: true, data: leave });
};

export const approveLeaveRequest = async (req: AuthRequest, res: Response) => {
  const existing = await prisma.leaveRequest.findUnique({
    where: { id: req.params.id },
    include: { employee: true }
  });
  if (!existing) return res.status(404).json({ success: false, message: 'Leave request not found' });

  const leave = await prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedBy: req.user!.id },
      include: { employee: true, approver: { select: { name: true } } }
    });

    let current = dayjs(existing.startDate).startOf('day');
    const end = dayjs(existing.endDate).startOf('day');
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      await tx.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: existing.employeeId,
            date: current.toDate()
          }
        },
        update: {
          status: 'LEAVE',
          markedBy: req.user!.id
        },
        create: {
          employeeId: existing.employeeId,
          date: current.toDate(),
          status: 'LEAVE',
          markedBy: req.user!.id
        }
      });
      current = current.add(1, 'day');
    }

    return updated;
  });

  res.json({ success: true, data: leave, message: 'Leave approved and attendance updated' });
};

export const rejectLeaveRequest = async (req: AuthRequest, res: Response) => {
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', approvedBy: req.user!.id },
    include: { employee: true, approver: { select: { name: true } } }
  });
  res.json({ success: true, data: leave });
};

export const getEmployeeLeaveRequests = async (req: AuthRequest, res: Response) => {
  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: req.params.employeeId },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: leaves });
};

export const getLeaveBalance = async (req: AuthRequest, res: Response) => {
  const year = new Date().getFullYear();
  const used = await prisma.leaveRequest.aggregate({
    where: {
      employeeId: req.params.employeeId,
      status: 'APPROVED',
      startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59`) }
    },
    _sum: { totalDays: true }
  });
  const annualAllowance = 24;
  res.json({ success: true, data: { year, annualAllowance, used: used._sum.totalDays || 0, remaining: annualAllowance - (used._sum.totalDays || 0) } });
};
