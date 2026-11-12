// CONTROLLER: builds the student dashboard from the model's queries.
import * as Student from "../model/studentModel.js";
import { CANCEL_NOTICE_HOURS } from "../model/lessonModel.js";

// GET /api/student/dashboard  (students only)
export async function getDashboard(req, res, next) {
  try {
    const studentId = req.user.id;
    const rank = await Student.getRank(studentId);

    // Signed up, but no student_profiles row yet (no belt or centre recorded).
    if (!rank) return res.json({ profileReady: false });

    const [classesAtRank, nextClass, attendance, membership, credits, recommended, payments, grading] =
      await Promise.all([
        Student.countClassesSince(studentId, rank.belt_awarded_on),
        Student.getNextBookedClass(studentId),
        Student.getAttendanceSummary(studentId),
        Student.getMembership(studentId),
        Student.getCreditBalance(studentId),
        Student.getRecommendedClasses(studentId, rank.rank_order),
        Student.getRecentPayments(studentId),
        Student.getOpenGrading(studentId, rank.home_centre_id),
      ]);

    const hasNext = Boolean(rank.next_belt);
    const classesNeeded = hasNext ? Math.max(0, rank.min_classes_at_rank - classesAtRank) : 0;
    const monthsNeeded = hasNext ? Math.max(0, rank.min_months_at_rank - rank.months_at_rank) : 0;

    res.json({
      profileReady: true,
      rank: {
        previous: rank.previous_belt,
        current: rank.current_belt,
        next: rank.next_belt,
        awardedOn: rank.belt_awarded_on,
        monthsAtRank: rank.months_at_rank,
        classesAtRank,
        classesRequired: rank.min_classes_at_rank,
        monthsRequired: rank.min_months_at_rank,
        classesNeeded,
        monthsNeeded,
        eligible: hasNext && classesNeeded === 0 && monthsNeeded === 0,
      },
      grading: grading && {
        centre: grading.centre,
        date: grading.grading_date,
        closesOn: grading.closes_on,
        applicationStatus: grading.application_status,
      },
      nextClass: nextClass && {
        sessionId: nextClass.session_id,
        title: nextClass.title,
        centre: nextClass.centre,
        instructor: nextClass.instructor,
        date: nextClass.session_date,
        startTime: nextClass.start_time,
        freeCancel: nextClass.free_cancel,
        cancelBy: { date: nextClass.cancel_by_date, time: nextClass.cancel_by_time },
      },
      cancelNoticeHours: CANCEL_NOTICE_HOURS,
      attendance: {
        thisMonth: attendance.this_month,
        attended: attendance.attended,
        pastBooked: attendance.past_booked,
        rate: attendance.past_booked ? Math.round((attendance.attended / attendance.past_booked) * 100) : null,
      },
      membership: membership && {
        plan: membership.plan,
        endDate: membership.end_date,
        daysLeft: membership.days_left,
        state: membership.status !== "active" || membership.days_left < 0
          ? "expired"
          : membership.days_left <= 7 ? "expiring" : "active",
      },
      credits,
      recommended: recommended.map((c) => ({
        id: c.id,
        title: c.title,
        centre: c.centre,
        date: c.session_date,
        startTime: c.start_time,
        openToAll: c.open_to_all,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        purpose: p.purpose,
        amountCents: p.amount_cents,
        currency: p.currency,
        status: p.status,
        date: p.paid_on,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/student/profile
export async function getProfile(req, res, next) {
  try {
    const row = await Student.getStudentProfile(req.user.id);
    if (!row) return res.status(404).json({ message: 'Student not found.' });
    res.set('Cache-Control', 'private, no-store');
    res.json({ profile: {
      id: row.id, fullName: row.full_name, email: row.email,
      dateOfBirth: row.date_of_birth, gender: row.gender,
      experienceLevel: row.experience_level, previousRank: row.previous_rank,
      experienceNotes: row.experience_notes, evidenceFilename: row.evidence_filename,
      membershipPlan: row.membership_plan, membershipStatus: row.membership_status,
      phone: row.phone, trainingGoal: row.training_goal,
      hasPhoto: row.has_photo, joinedOn: row.joined_on,
      onboardingComplete: row.date_of_birth !== null,
    } });
  } catch (err) { next(err); }
}
