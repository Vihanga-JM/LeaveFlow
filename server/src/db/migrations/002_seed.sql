INSERT INTO leave_types
(name, annual_allocation)
VALUES
('Annual',14),
('Casual',7),
('Sick',7);


INSERT INTO users
(name,email,password_hash,role,manager_id)
VALUES
(
'Ruwan Jayasuriya',
'ruwan@ceylonroots.lk',
'$2b$10$DBnMjMn0hRwS60mI/JKx9.xfxiFHDggVb15IB3X.Iu5NiOq41deSy',
'MANAGER',
NULL
),
(
'Ishara Fernando',
'ishara@ceylonroots.lk',
'$2b$10$DBnMjMn0hRwS60mI/JKx9.xfxiFHDggVb15IB3X.Iu5NiOq41deSy',
'EMPLOYEE',
1
),
(
'Dilini Weerasinghe',
'dilini@ceylonroots.lk',
'$2b$10$DBnMjMn0hRwS60mI/JKx9.xfxiFHDggVb15IB3X.Iu5NiOq41deSy',
'HR_ADMIN',
NULL
);