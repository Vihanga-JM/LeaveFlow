const { leaveDays } = require('../src/lib/leaveDays');

describe('leaveDays', () => {
  test('counts a normal Mon-Fri span as 5 days', () => {
    expect(leaveDays('2026-03-02', '2026-03-06')).toBe(5);
  });

  test('counts a single working day as 1', () => {
    expect(leaveDays('2026-03-04', '2026-03-04')).toBe(1);
  });

  test('excludes the weekend in a Fri-Mon span', () => {
    expect(leaveDays('2026-03-06', '2026-03-09')).toBe(2);
  });

  test('throws when end is before start', () => {
    expect(() => leaveDays('2026-03-06', '2026-03-02')).toThrow(
      'end_date must not be before start_date'
    );
  });

  test('excludes Vesak poya from a spanning request', () => {
    const holidays = ['2026-05-01'];

    expect(
      leaveDays('2026-04-29', '2026-05-04', holidays)
    ).toBe(3);
  });
});

describe('leaveDays — long weekends', () => {
  test('Fri–Tue over a holiday Monday counts only Fri and Tue', () => {
    // Fri 2 Oct, (Sat, Sun), Mon 5 Oct holiday, Tue 6 Oct
    expect(leaveDays('2026-10-02', '2026-10-06', ['2026-10-05'])).toBe(2);
  });

  test('a range that is only weekend and holiday counts 0', () => {
    // Sat 25 Apr – Mon 27 Apr with Monday a holiday
    expect(leaveDays('2026-04-25', '2026-04-27', ['2026-04-27'])).toBe(0);
  });
});

describe('leaveDays — half days', () => {
  test('an AM half day on a working day is 0.5', () => {
    expect(leaveDays('2026-10-07', '2026-10-07', [], 'AM')).toBe(0.5);
  });

  test('a PM half day on a Friday is 0.5', () => {
    expect(leaveDays('2026-10-09', '2026-10-09', [], 'PM')).toBe(0.5);
  });

  test('a half day on a poya counts 0', () => {
    expect(leaveDays('2026-05-01', '2026-05-01', ['2026-05-01'], 'AM')).toBe(0);
  });

  test('a half day on a Saturday counts 0', () => {
    expect(leaveDays('2026-10-10', '2026-10-10', [], 'PM')).toBe(0);
  });

  test('a half day spanning two dates throws', () => {
    expect(() => leaveDays('2026-10-07', '2026-10-08', [], 'AM')).toThrow(
      'a half day must be a single date'
    );
  });

  test('FULL is the default and behaves as before', () => {
    expect(leaveDays('2026-10-07', '2026-10-07', [], 'FULL')).toBe(1);
  });

  test('an unknown day part throws', () => {
    expect(() => leaveDays('2026-10-07', '2026-10-07', [], 'EVENING')).toThrow(
      'day_part must be FULL, AM or PM'
    );
  });
});
