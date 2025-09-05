### Microservice usage

## Head Service

**Incoming socket** => headPosition
**Outgoing socket** => headPositionRes
**Input usage** => ( data["buffer"], data["user_id"], data["exam_id"])
**Output format**
{
"UserId" : (return what u send),
"ExamId" : (return what u send),
"data" : {"headPosition" : head } ,
"code" : (0 || -1) <!-- Status code -->
}

---

## Eye Service

**Incoming socket** => eyePosition
**Outgoing socket** => eyePositionRes
**Input usage** => ( data["buffer"], data["user_id"], data["exam_id"])
**Output format**
{
"UserId" : (return what u send),
"ExamId" : (return what u send),
"data" : {"leftEye" : eye[0] , "rightEye" : eye[1]},
"code" : (0 || -1) <!-- Status code -->
}

---


