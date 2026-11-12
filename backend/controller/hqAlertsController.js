import { getOpenHQAlerts, acknowledgeHQAlert } from '../model/hqAlertsModel.js';
export async function list(req,res,next) {
 try { res.set('Cache-Control','private, no-store'); res.json({alerts:await getOpenHQAlerts()}); }
 catch(e){next(e)}
}
export async function acknowledge(req,res,next) {
 try {
  const id=Number(req.params.alertId);
  if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:'Invalid alert ID.'});
  const row=await acknowledgeHQAlert(id,req.user.id);
  if(!row)return res.status(409).json({message:'Alert already acknowledged or not found.'});
  res.json({acknowledged:true,id:row.id});
 } catch(e){next(e)}
}
