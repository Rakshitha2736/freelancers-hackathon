const {
  addDays,
  endOfMonth,
  isValid,
  nextSaturday,
  nextMonday,
  set,
  startOfDay,
} = require('date-fns');
const chrono = require('chrono-node');

const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function atDefaultTime(date) {
  return set(date, { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 });
}

function atEveningTime(date) {
  return set(date, { hours: 18, minutes: 0, seconds: 0, milliseconds: 0 });
}

function atEodTime(date) {
  return set(date, { hours: 17, minutes: 0, seconds: 0, milliseconds: 0 });
}

function getUpcomingWeekday(baseDate, weekdayIndex) {
  const today = startOfDay(baseDate);
  const currentDay = today.getDay();
  const offset = (weekdayIndex - currentDay + 7) % 7;
  const target = addDays(today, offset);
  return atDefaultTime(target);
}

function getNextWeekday(baseDate, weekdayIndex) {
  const today = startOfDay(baseDate);
  const currentDay = today.getDay();
  let offset = (weekdayIndex - currentDay + 7) % 7;
  if (offset === 0) {
    offset = 7;
  }
  return atDefaultTime(addDays(today, offset));
}

function parseAbsoluteDate(text) {
  const normalizedText = text.trim();
  const parsed = chrono.parseDate(normalizedText, new Date());
  return parsed && isValid(parsed) ? parsed : null;
}

function parseDeadline(textDeadline) {
  const now = new Date();

  if (!isValid(now)) {
    return null;
  }

  if (textDeadline instanceof Date && isValid(textDeadline)) {
    const dateValue = new Date(textDeadline);
    while (dateValue < now) {
      dateValue.setDate(dateValue.getDate() + 7);
    }
    return dateValue.toISOString();
  }

  if (typeof textDeadline === 'number') {
    const numericDate = new Date(textDeadline);
    if (isValid(numericDate)) {
      while (numericDate < now) {
        numericDate.setDate(numericDate.getDate() + 7);
      }
      return numericDate.toISOString();
    }
  }

  if (!textDeadline || typeof textDeadline !== 'string') {
    return null;
  }

  const normalized = textDeadline.trim().toLowerCase();
  let parsed = null;

  if (normalized === 'today') {
    parsed = new Date(now);
  } else if (normalized === 'tomorrow') {
    parsed = atDefaultTime(addDays(now, 1));
  } else if (normalized === 'eod' || normalized === 'end of day') {
    parsed = atEodTime(now);
  } else if (/^within\s+two\s+days$/.test(normalized) || /^within\s+2\s+days$/.test(normalized)) {
    parsed = atDefaultTime(addDays(now, 2));
  } else if (normalized === 'next week') {
    parsed = atDefaultTime(addDays(now, 7));
  } else if (normalized === 'end of month') {
    parsed = atDefaultTime(endOfMonth(now));
  } else if (normalized === 'this weekend') {
    parsed = atDefaultTime(nextSaturday(now));
  } else if (normalized === 'next monday') {
    parsed = atDefaultTime(nextMonday(now));
  } else if (/^in\s+the\s+next\s+sprint$/.test(normalized)) {
    parsed = atDefaultTime(addDays(now, 14));
  } else if (/^before\s+release$/.test(normalized)) {
    parsed = atDefaultTime(addDays(now, 7));
  } else {
    const byWeekdayMatch = normalized.match(/^by\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(\s+evening)?$/);
    const nextWeekdayMatch = normalized.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);

    if (byWeekdayMatch) {
      const dayName = byWeekdayMatch[1];
      const isEvening = Boolean(byWeekdayMatch[2]);
      const target = getUpcomingWeekday(now, WEEKDAY_INDEX[dayName]);
      parsed = isEvening ? atEveningTime(target) : target;
    } else if (nextWeekdayMatch) {
      const dayName = nextWeekdayMatch[1];
      parsed = getNextWeekday(now, WEEKDAY_INDEX[dayName]);
    } else {
      parsed = parseAbsoluteDate(normalized);
    }
  }

  if (!parsed || !isValid(parsed)) {
    console.warn('Could not parse deadline:', textDeadline);
    return null;
  }

  while (parsed < now) {
    parsed = addDays(parsed, 7);
  }

  return parsed.toISOString();
}

module.exports = {
  parseDeadline,
};
