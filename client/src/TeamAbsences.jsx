import { useEffect, useState } from 'react';
import { api } from './api';

// "Who else is off?" panel shown beside a pending request on the Approvals page.
export default function TeamAbsences({ from, to, excludeUserId }) {
  const [absences, setAbsences] = useState(null);

  useEffect(() => {
    let active = true;
    api(`/team/absences?from=${from}&to=${to}`)
      .then((rows) => active && setAbsences(rows.filter((a) => a.user_id !== excludeUserId)))
      .catch(() => active && setAbsences([]));
    return () => { active = false; };
  }, [from, to, excludeUserId]);

  if (absences === null) return null;

  if (absences.length === 0) {
    return <small className="absences">✓ No one else is off</small>;
  }

  return (
    <small className="absences warn">
      {'Also off: '}
      {absences
        .map((a) => `${a.employee_name} (${a.start_date} → ${a.end_date})`)
        .join(', ')}
    </small>
  );
}
