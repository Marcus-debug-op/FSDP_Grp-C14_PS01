import { findStudentApplicationStatus, findCurrentMembership } from '../model/studentApplicationStatusModel.js';

function displayState(a) {
  if (a.membership_currently_active) return 'active_member';
  if (a.approval_status === 'rejected') return 'rejected';
  if (a.photo_review_status === 'resubmission_requested') return 'photo_resubmission_required';
  if (a.photo_review_status === 'resubmitted') return 'awaiting_photo_review';
  if (a.linked_payment_status !== 'succeeded') return 'pending_payment';
  if (a.approval_status === 'pending') return 'pending_approval';
  // Approved but still waiting for activation or an original photo review.
  return 'awaiting_activation';
}

// GET /api/student/application/status — always scoped to the JWT's student ID.
export async function getApplicationStatus(req, res, next) {
  try {
    const [application, current] = await Promise.all([
      findStudentApplicationStatus(req.user.id),
      findCurrentMembership(req.user.id),
    ]);
    // Any membership active today counts (renewals and existing members included),
    // not only the one created by the latest application.
    const activeMembership = current
      ? { planName: current.plan_name, startDate: current.start_date, endDate: current.end_date }
      : null;
    res.set('Cache-Control', 'private, no-store');
    if (!application) return res.json({ application: null, activeMembership });
    res.json({ activeMembership, application: {
      id: application.application_id,
      status: activeMembership ? 'active_member' : displayState(application),
      approvalStatus: application.approval_status,
      photoReviewStatus: application.photo_review_status,
      photoReviewNote: application.photo_review_status === 'resubmission_requested'
        ? application.photo_review_note : null,
      rejectionReason: application.approval_status === 'rejected'
        ? application.rejection_reason : null,
      paymentStatus: application.linked_payment_status || 'unlinked',
      planName: application.plan_name,
      planId: application.plan_id,
      preferredCentre: application.preferred_centre,
      submittedAt: application.submitted_at,
      reviewedAt: application.reviewed_at,
      membership: application.membership_id ? {
        status: application.membership_status,
        startDate: application.membership_start_date,
        endDate: application.membership_end_date,
      } : null,
    } });
  } catch (error) { next(error); }
}
