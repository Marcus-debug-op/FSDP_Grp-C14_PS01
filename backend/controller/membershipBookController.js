import { advanceBookStatus } from "../model/membershipBookModel.js";

export async function advance(req, res, next) {
  try {
    const applicationId = Number(req.params.id);
    const adminId = Number(req.user?.id);
    const status = req.body?.status;
    if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({ message: "Invalid application ID." });
    }
    if (!Number.isSafeInteger(adminId) || adminId < 1) {
      return res.status(403).json({ message: "Admin identity missing." });
    }
    if (!["preparing", "ready", "issued"].includes(status)) {
      return res.status(400).json({ message: "Invalid book status." });
    }
    const book = await advanceBookStatus({ applicationId, next: status, adminId });
    if (!book) {
      return res.status(409).json({
        message: "Cannot update book. Confirm active membership and the previous book stage, then refresh."
      });
    }
    res.set("Cache-Control", "private, no-store");
    res.json({ book });
  } catch (err) { next(err); }
}
