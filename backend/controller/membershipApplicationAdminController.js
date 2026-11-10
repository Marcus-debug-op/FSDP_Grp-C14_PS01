import * as Applications from "../model/membershipApplicationAdminModel.js";

const allowedStatuses = new Set(['all','pending','approved','rejected']);

export async function list(req, res, next) {
  try {
    const status = String(req.query.status || 'pending');
    if (!allowedStatuses.has(status)) return res.status(400).json({ message: 'Invalid status filter.' });
    const applications = await Applications.listApplications(status);
    res.set('Cache-Control','private, no-store');
    res.json({ applications });
  } catch (err) { next(err); }
}

export async function detail(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid application ID.' });
    const application = await Applications.findApplication(id);
    if (!application) return res.status(404).json({ message: 'Application not found.' });
    res.set('Cache-Control','private, no-store');
    res.json({ application });
  } catch (err) { next(err); }
}

export async function decide(req, res, next) {
  try {
    const id = Number(req.params.id);
    const decision = req.body?.decision;
    const rejectionReason = String(req.body?.rejectionReason || '').trim();
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid application ID.' });
    if (!['approved','rejected'].includes(decision)) return res.status(400).json({ message: 'Invalid decision.' });
    if (decision === 'rejected' && (rejectionReason.length < 5 || rejectionReason.length > 1000)) {
      return res.status(400).json({ message: 'Provide a rejection reason (5–1000 characters).' });
    }
    
    const decisionResult = await Applications.decideApplication({
      applicationId: id,
      reviewerId: req.user.id,
      decision,
      rejectionReason
    });

    if (!decisionResult) {
      return res.status(409).json({
        message:
          "Application already reviewed or photo not accepted."
      });
    }

    res.set("Cache-Control", "private, no-store");

    res.json({
      application: decisionResult.application,
      activation: decisionResult.activation
    });

  } catch (err) { next(err); }
}

// Admin-only photo access. Image bytes never go into the JSON application list.
export async function photo(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid application ID.' });
    }
    const result = await Applications.findApplicationPhoto(id);
    if (!result?.photo_data || !['image/jpeg', 'image/png', 'image/webp'].includes(result.photo_mime)) {
      return res.status(404).json({ message: 'No profile photo available.' });
    }
    res.set({
      'Content-Type': result.photo_mime,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(result.photo_data);
  } catch (err) { next(err); }
}

export async function requestPhoto(req, res, next) {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid application ID.' });
    if (reason.length < 10 || reason.length > 500) return res.status(400).json({ message: 'Explain why a replacement photo is needed (10–500 characters).' });
    const review = await Applications.requestPhotoResubmission({ applicationId: id, adminId: req.user.id, reason });
    if (!review) return res.status(409).json({ message: 'Application is already reviewed or cannot request another photo yet. Refresh.' });
    res.set('Cache-Control','private, no-store');
    res.json({ review });
  } catch (err) { next(err); }
}

export async function acceptPhoto(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid application ID.' });
    const review = await Applications.acceptApplicationPhoto(id);
    if (!review) return res.status(409).json({ message: 'Photo is unavailable or cannot be accepted. Refresh.' });
    res.set('Cache-Control','private, no-store');
    res.json({ review });
  } catch (err) { next(err); }
}
