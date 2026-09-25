const express = require("express");
const pool = require("../db/pool");

const router = express.Router();


const dayCount = (start,end)=>
(
  new Date(end)-new Date(start)
) / 86400000;



router.post("/", async(req,res,next)=>{

try {

const {
leave_type_id,
start_date,
end_date,
reason
}=req.body;


const userId =
Number(req.body.user_id);


const year =
new Date(start_date).getFullYear();



const lt =
await pool.query(
"SELECT annual_allocation FROM leave_types WHERE id=$1",
[leave_type_id]
);


if(!lt.rowCount){

return res.status(400).json({
error:{
code:"BAD_TYPE",
message:"Unknown leave type"
}
});

}



const bal =
await pool.query(
`
SELECT used_days
FROM leave_balances
WHERE user_id=$1
AND leave_type_id=$2
AND year=$3
`,
[
userId,
leave_type_id,
year
]
);


const used =
bal.rowCount
? Number(bal.rows[0].used_days)
:0;



if(
used + dayCount(start_date,end_date)
>
lt.rows[0].annual_allocation
){

return res.status(409).json({
error:{
code:"INSUFFICIENT_BALANCE",
message:"Insufficient balance"
}
});

}



const ins =
await pool.query(
`
INSERT INTO leave_requests
(
user_id,
leave_type_id,
start_date,
end_date,
reason
)
VALUES($1,$2,$3,$4,$5)
RETURNING *
`,
[
userId,
leave_type_id,
start_date,
end_date,
reason
]
);


res.status(201)
.json(ins.rows[0]);


}catch(err){
next(err);
}

});

router.get("/", async(req,res,next)=>{

try{

const result =
await pool.query(
`
SELECT *
FROM leave_requests
ORDER BY created_at DESC
`
);

res.json(result.rows);


}catch(err){
next(err);
}

});
router.patch("/:id", async (req, res, next) => {
  const { action } = req.body;

  if (action !== "approve" && action !== "reject" && action !== "cancel") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid action",
      },
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE leave_requests
      SET 
        status = $1,
        decided_by = $2,
        decided_at = now()
      WHERE id = $3
      AND status = 'PENDING'
      RETURNING *
      `,
      [
        action === "approve"
          ? "APPROVED"
          : action === "reject"
          ? "REJECTED"
          : "CANCELLED",
        Number(req.body.decided_by),
        req.params.id,
      ]
    );

    if (!result.rowCount) {
      return res.status(409).json({
        error: {
          code: "INVALID_STATE",
          message: "Request is not pending",
        },
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    next(err);
  }
});



module.exports = router;