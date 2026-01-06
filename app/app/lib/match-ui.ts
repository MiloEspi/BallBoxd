type StatusMeta = {
  label: string;
  tone: 'live' | 'finished' | 'pending' | 'paused' | 'warning' | 'neutral';
};

const STATUS_LABELS: Record<string, StatusMeta> = {
  FINISHED: { label: 'FINISHED', tone: 'finished' },
  AWARDED: { label: 'FINISHED', tone: 'finished' },
  IN_PLAY: { label: 'LIVE', tone: 'live' },
  LIVE: { label: 'LIVE', tone: 'live' },
  PAUSED: { label: 'PAUSED', tone: 'paused' },
  SCHEDULED: { label: 'PENDING', tone: 'pending' },
  TIMED: { label: 'PENDING', tone: 'pending' },
  POSTPONED: { label: 'POSTPONED', tone: 'warning' },
  SUSPENDED: { label: 'SUSPENDED', tone: 'warning' },
  CANCELLED: { label: 'CANCELLED', tone: 'warning' },
};

export const getStatusMeta = (
  status?: string | null,
  dateTime?: string,
): StatusMeta => {
  const value = (status ?? '').toUpperCase();
  if (value && STATUS_LABELS[value]) {
    return STATUS_LABELS[value];
  }
  if (!dateTime) {
    return { label: 'PENDING', tone: 'pending' };
  }
  const kickoff = new Date(dateTime);
  if (Number.isNaN(kickoff.getTime())) {
    return { label: 'PENDING', tone: 'pending' };
  }
  return kickoff.getTime() < Date.now()
    ? { label: 'FINISHED', tone: 'finished' }
    : { label: 'PENDING', tone: 'pending' };
};

export const formatKickoff = (value: string) => {
  const date = new Date(value);
  return {
    dateLabel: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    fullLabel: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  };
};
