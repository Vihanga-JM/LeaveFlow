CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('EMPLOYEE','MANAGER','HR_ADMIN')
  ),
  manager_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE leave_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  annual_allocation INTEGER NOT NULL
);


CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (
      status IN (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'CANCELLED'
      )
    ),
  decided_by INTEGER REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE leave_balances (
  user_id INTEGER NOT NULL REFERENCES users(id),
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  used_days NUMERIC(4,1) NOT NULL DEFAULT 0,
  PRIMARY KEY (
    user_id,
    leave_type_id,
    year
  )
);