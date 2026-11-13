import { reapplyMembership } from '../model/membershipReapplicationModel.js';

// POST /api/student/application/reapply; only from signed-in student's JWT.
export async function reapply(req,res,next) {
 try {
   const note=String(req.body?.note ?? '').trim();
   if (note.length < 10 || note.length > 500) {
     return res.status(400).json({message:'Explain your request for reconsideration (10–500 characters).'});
   }
   const result=await reapplyMembership(req.user.id,note);
   if (!result.allowed) return res.status(409).json({message:result.reason});
   res.set('Cache-Control','private, no-store');
   return res.json({message:'Application submitted for reconsideration. Do not pay again unless prompted.',application:result.application});
 } catch(error) { next(error); }
}
