import prisma from '../db/prisma.js';
import { settingsSchema } from '../validators/index.js';

export async function getSettings(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({
        success: true,
        settings: {
          currencyCode: 'INR',
          currencySymbol: '₹',
          locale: 'en-IN',
          theme: 'system',
          accentColor: 'emerald',
          firstDayOfWeek: 1,
          dateFormat: 'DD/MM/YYYY',
          budgetWarnings: true,
          dailyReminder: false,
          splitReminders: true,
        },
      });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: req.user.id,
          currencyCode: 'INR',
          currencySymbol: '₹',
          locale: 'en-IN',
          theme: 'system',
          accentColor: 'emerald',
          firstDayOfWeek: 1,
          dateFormat: 'DD/MM/YYYY',
          budgetWarnings: true,
          dailyReminder: false,
          splitReminders: true,
        },
      });
    }

    return res.status(200).json({ success: true, settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const data = settingsSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one settings field must be provided to update',
      });
    }

    if (!prisma) {
      return res.status(200).json({
        success: true,
        settings: data,
      });
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: data,
      create: {
        userId: req.user.id,
        ...data,
      },
    });

    return res.status(200).json({ success: true, settings: updated });
  } catch (err) {
    next(err);
  }
}
