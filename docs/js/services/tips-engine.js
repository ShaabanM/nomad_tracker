// Contextual tip generation — ported from TipsEngine.swift
import { findJurisdictionForCitizenship } from '../data/citizenship-rules.js';
import * as rules from './rules-engine.js';
import { todayStr, parseDate, getCitizenship } from './storage.js';

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

  // Deadline warnings
  if (used > 0) {
    const leaveBy = rules.mustLeaveBy(jurisdiction, records, asOf);
    const leaveDate = formatDate(leaveBy);

    if (remaining <= 7) {
      tips.push({
        icon: 'exclamation-triangle-fill',
        title: `Leave ${jurisdiction.name} by ${leaveDate}`,
        message: `Only ${remaining} day${remaining === 1 ? '' : 's'} remaining! Book your departure now.`,
        priority: 'critical',
        category: 'deadline',
      });
    } else if (remaining <= 14) {
      tips.push({
        icon: 'exclamation-triangle',
        title: `${remaining} days remaining in ${jurisdiction.name}`,
        message: `Start planning your departure. You must leave by ${leaveDate}.`,
        priority: 'high',
        category: 'deadline',
      });
    } else if (remaining <= 30) {
      tips.push({
        icon: 'clock',
        title: `${remaining} days remaining in ${jurisdiction.name}`,
        message: `You can stay until ${leaveDate} if you remain continuously.`,
        priority: 'medium',
        category: 'deadline',
      });
    } else {
      tips.push({
        icon: 'check-circle',
        title: `Comfortable in ${jurisdiction.name}`,
        message: `${remaining} of ${max} days remaining. Can stay until ${leaveDate}.`,
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
  const citizenCode = getCitizenship();
  const schengen = findJurisdictionForCitizenship('schengen', citizenCode);

  // Schengen exit suggestions (only if Schengen is visa-free)
  if (currentJurisdiction?.id === 'schengen' && schengen && !schengen.visaRequired) {
    const remaining = rules.daysRemaining(schengen, records, asOf);

    if (remaining <= 30) {
      // Build suggestion from visa-free destinations only
      const exitOptions = [];
      const candidates = [
        { id: 'georgia', label: 'Georgia' },
        { id: 'albania', label: 'Albania' },
        { id: 'montenegro', label: 'Montenegro' },
        { id: 'turkey', label: 'Turkey' },
        { id: 'uk', label: 'UK' },
      ];
      for (const c of candidates) {
        const j = findJurisdictionForCitizenship(c.id, citizenCode);
        if (j && !j.visaRequired) {
          exitOptions.push(`${c.label} (${j.maxDays}${j.unrestricted ? '+' : ''} days)`);
        }
      }
      if (exitOptions.length > 0) {
        tips.push({
          icon: 'airplane',
          title: 'Plan your Schengen exit',
          message: `Consider these destinations: ${exitOptions.join(', ')}.`,
          priority: 'high',
          category: 'suggestion',
        });
      }
    }

    tips.push({
      icon: 'info-circle',
      title: 'Schengen rolling window',
      message: "The 90/180 rule uses a rolling window \u2014 on any given day, immigration looks back 180 days. A 1-day trip outside Schengen doesn't meaningfully help.",
      priority: 'low',
      category: 'info',
    });
  }

  // Georgia promotion (only if visa-free)
  const georgia = findJurisdictionForCitizenship('georgia', citizenCode);
  if (currentJurisdiction?.id !== 'georgia' && georgia && !georgia.visaRequired) {
    const georgiaUsed = rules.daysUsed(georgia, records, asOf);
    if (georgiaUsed === 0) {
      tips.push({
        icon: 'star',
        title: `Georgia: ${georgia.maxDays} days visa-free`,
        message: "One of the most generous visa policies in the world. Perfect for a Schengen cooldown with vibrant nomad community in Tbilisi.",
        priority: 'low',
        category: 'suggestion',
      });
    }
  }

  // Colombia calendar year warning (only if visa-free)
  const colombia = findJurisdictionForCitizenship('colombia', citizenCode);
  if (colombia && !colombia.visaRequired) {
    const colombiaUsed = rules.daysUsed(colombia, records, asOf);
    if (colombiaUsed > 0) {
      tips.push({
        icon: 'exclamation-circle',
        title: "Colombia: Border runs don't help",
        message: `Colombia counts ALL days in a calendar year. Leaving and re-entering does NOT reset your counter. ${colombiaUsed}/${colombia.maxDays} days used this year.`,
        priority: 'medium',
        category: 'info',
      });
    }
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
