import { Event } from '@/types';

export const DEFAULT_EVENT_START_TIME = '10:00';
export const DEFAULT_EVENT_END_TIME = '12:00';

function padTimePart(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatOffset(minutesWestOfUtc: number): string {
  const totalMinutes = -minutesWestOfUtc;
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${padTimePart(hours)}:${padTimePart(minutes)}`;
}

export function buildEventDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return `${date}T${padTimePart(hours)}:${padTimePart(minutes)}:00${formatOffset(localDate.getTimezoneOffset())}`;
}

export function extractTimeValue(dateTime: string | null | undefined, fallback: string): string {
  if (!dateTime) {
    return fallback;
  }

  const match = dateTime.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : fallback;
}

export function getDefaultEventTimeRange(date: string): Pick<Event, 'timeStart' | 'timeEnd'> {
  return {
    timeStart: buildEventDateTime(date, DEFAULT_EVENT_START_TIME),
    timeEnd: buildEventDateTime(date, DEFAULT_EVENT_END_TIME),
  };
}

export function normalizeEventDateTimes(event: Pick<Event, 'date'> & Partial<Pick<Event, 'timeStart' | 'timeEnd'>>): Pick<Event, 'timeStart' | 'timeEnd'> {
  return {
    timeStart: event.timeStart ?? buildEventDateTime(event.date, DEFAULT_EVENT_START_TIME),
    timeEnd: event.timeEnd ?? buildEventDateTime(event.date, DEFAULT_EVENT_END_TIME),
  };
}

export function getEventTimeRangeLabel(event: Pick<Event, 'date' | 'timeStart' | 'timeEnd'>): string {
  const { timeStart, timeEnd } = normalizeEventDateTimes(event);
  return `${extractTimeValue(timeStart, DEFAULT_EVENT_START_TIME)} - ${extractTimeValue(timeEnd, DEFAULT_EVENT_END_TIME)}`;
}

export function isEventActive(event: Pick<Event, 'date'> & Partial<Pick<Event, 'timeStart' | 'timeEnd'>>): boolean {
  const { timeEnd } = normalizeEventDateTimes(event);
  return new Date(timeEnd).getTime() >= Date.now();
}