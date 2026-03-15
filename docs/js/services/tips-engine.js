// Contextual tip generation — ported from TipsEngine.swift
import { findJurisdiction, RULE_TYPES } from '../data/jurisdictions.js';
import * as rules from './rules-engine.js';
import { todayStr } from './storage.js';

export function generateTips(currentJurisdiction, records, asOf = todayStr()) {
  const tips = [];

  if (currentJurisdiction) {
    tips.push(...currentJurisdictionTips(currentJurisdiction, records, asOf));
  }
  tips.push(...generalTips(currentJurisdiction, records, asOf));

  // Sort by priority (higher = more important)
  const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
  tips.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return tips;
}

function currentJurisdictionTips(jurisdiction, records, asOf) {
  const tips = [];
  const remaining = rules.daysRemaining(jurisdiction, records, asOf);
  const used = rules.daysUsed(jurisdiction, records, asOf);
  const max = jurisdiction.maxDays;
  const extraDays = rules.projectedExtraDays(jurisdiction, records, asOf);
  const fullReset = rules.fullAllowanceResetDate(jurisdiction, records, asOf);
  const rollingProjectionNote = extraDays > 0
    ? ` Older days should fall out of the rolling window while you stay, buying you about ${extraDays} extra day${extraDays === 1 ? '' : 's'}.`
    : '';

  // Deadline warnings
  if (used > 0) {
    const leaveBy = rules.mustLeaveBy(jurisdiction, records, asOf);
    const leaveDate = formatDate(leaveBy);

    if (remaining <= 7) {
      tips.push({
        icon: 'exclamation-triangle-fill',
        title: `Leave ${jurisdiction.name} by ${leaveDate}`,
        message: `Only ${remaining} day${remaining === 1 ? '' : 's'} remaining! Book your departure now.${rollingProjectionNote}`,
        priority: 'critical',
        category: 'deadline',
      });
    } else if (remaining <= 14) {
      tips.push({
        icon: 'exclamation-triangle',
        title: `${remaining} days remaining in ${jurisdiction.name}`,
        message: `Start planning your departure. You must leave by ${leaveDate}.${rollingProjectionNote}`,
        priority: 'high',
        category: 'deadline',
      });
    } else if (remaining <= 30) {
      tips.push({
        icon: 'clock',
        title: `${remaining} days remaining in ${jurisdiction.name}`,
        message: `You can stay until ${leaveDate} if you remain continuously.${rollingProjectionNote}`,
        priority: 'medium',
        category: 'deadline',
      });
    } else {
      tips.push({
        icon: 'check-circle',
        title: `Comfortable in ${jurisdiction.name}`,
        message: `${remaining} of ${max} days remaining. Can stay until ${leaveDate}.${rollingProjectionNote}`,
        priority: 'low',
        category: 'status',
      });
    }
  }

  // Rolling window: day falloff info
  const fallOff = rules.nextDayFallsOff(jurisdiction, records, asOf);
  if (fallOff) {
    const label = jurisdiction.ruleType === 'rolling'
      ? `rolling ${jurisdiction.windowDays}-day window`
      : 'window';
    tips.push({
      icon: 'arrow-counterclockwise',
      title: 'Days falling off the window',
      message: `${fallOff.count} day${fallOff.count === 1 ? '' : 's'} will fall off the ${label} on ${formatDate(fallOff.date)}, giving you more allowance.`,
      priority: 'low',
      category: 'info',
    });
  }

  if (jurisdiction.ruleType === RULE_TYPES.ROLLING && fullReset && used > 0) {
    tips.push({
      icon: 'sparkles',
      title: `Full allowance restores on ${formatDate(fullReset)}`,
      message: `If you leave ${jurisdiction.name} now, that is the earliest date your rolling window returns to a clean slate.`,
      priority: remaining <= 14 ? 'medium' : 'low',
      category: 'info',
    });
  }

  // Calendar year reset
  if (jurisdiction.ruleType === 'calendarYear') {
    const resetDate = rules.calendarYearResetDate(asOf);
    tips.push({
      icon: 'calendar',
      title: `Counter resets on ${formatDate(resetDate)}`,
      message: `${jurisdiction.name} uses a calendar year system. Your day count resets to 0 on January 1.`,
      priority: 'low',
      category: 'info',
    });
  }

  return tips;
}

function generalTips(currentJurisdiction, records, asOf) {
  const tips = [];
  const schengen = findJurisdiction('schengen');

  // Schengen exit suggestions
  if (currentJurisdiction?.id === 'schengen') {
    const remaining = rules.daysRemaining(schengen, records, asOf);

    if (remaining <= 30) {
      tips.push({
        icon: 'airplane',
        title: 'Plan your Schengen exit',
        message: 'Consider these non-Schengen destinations: Georgia (365 days!), Albania (90 days), Montenegro (90 days), Turkey (90 days), or the UK (180 days).',
        priority: 'high',
        category: 'suggestion',
      });
    }

    tips.push({
      icon: 'info-circle',
      title: 'Schengen rolling window',
      message: "The 90/180 rule uses a rolling window \u2014 on any given day, immigration looks back 180 days. A 1-day trip outside Schengen doesn't meaningfully help.",
      priority: 'low',
      category: 'info',
    });
  }

  // Georgia promotion
  if (currentJurisdiction?.id !== 'georgia') {
    const georgia = findJurisdiction('georgia');
    const georgiaUsed = rules.daysUsed(georgia, records, asOf);
    if (georgiaUsed === 0) {
      tips.push({
        icon: 'star',
        title: 'Georgia: 365 days visa-free',
        message: "One of the most generous visa policies in the world. Perfect for a Schengen cooldown with vibrant nomad community in Tbilisi.",
        priority: 'low',
        category: 'suggestion',
      });
    }
  }

  // Colombia calendar year warning
  const colombia = findJurisdiction('colombia');
  const colombiaUsed = rules.daysUsed(colombia, records, asOf);
  if (colombiaUsed > 0) {
    tips.push({
      icon: 'exclamation-circle',
      title: "Colombia: Border runs don't help",
      message: `Colombia counts ALL days in a calendar year. Leaving and re-entering does NOT reset your counter. ${colombiaUsed}/180 days used this year.`,
      priority: 'medium',
      category: 'info',
    });
  }

  // Montenegro registration
  if (currentJurisdiction?.id === 'montenegro') {
    tips.push({
      icon: 'building',
      title: 'Register within 24 hours',
      message: 'Montenegro requires you to register with local police within 24 hours of arrival. Hotels do this automatically. For Airbnbs, you must register yourself.',
      priority: 'high',
      category: 'action',
    });
  }

  return tips;
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
