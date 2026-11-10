import pool from '../db.js';

export async function photoStatus(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT approval_status, photo_review_status, photo_review_note, photo_requested_at
       FROM membership_applications WHERE student_id = $1`, [req.user.id]
    );
    res.set('Cache-Control','private, no-store');
    res.json({ application: result.rows[0] || null });
  } catch (err) { next(err); }
}

function isValidImage(data, type) {
  if (type === 'image/jpeg') return data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === 'image/png') return data.length >= 8 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === 'image/webp') return data.length >= 12 && data.toString('ascii',0,4) === 'RIFF' && data.toString('ascii',8,12) === 'WEBP';
  return false;
}

// POST raw JPEG, PNG, or WEBP bytes. Authenticated student's own photo ONLY.
export async function resubmitPhoto(req, res, next) {
  let client;
  try {
    const type = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
    const data = req.body;
    if (!Buffer.isBuffer(data) || !data.length || data.length > 2 * 1024 * 1024 || !isValidImage(data, type)) {
      return res.status(400).json({ message: 'Choose a valid JPEG, PNG or WebP image up to 2MB.' });
    }
    client = await pool.connect();
    await client.query('BEGIN');
    const app = await client.query(
      `SELECT id FROM membership_applications WHERE student_id = $1
         AND approval_status = 'pending'
         AND photo_review_status = 'resubmission_requested' FOR UPDATE`,
      [req.user.id]
    );
    if (!app.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'There is no pending photo resubmission request.' });
    }
    const saved = await client.query(
      'UPDATE student_onboarding SET photo_mime = $2, photo_data = $3 WHERE user_id = $1 RETURNING user_id',
      [req.user.id, type, data]
    );
    if (!saved.rowCount) throw new Error('Student onboarding profile not found.');
    await client.query(
      `UPDATE membership_applications SET photo_review_status = 'resubmitted',
           photo_resubmitted_at = NOW() WHERE id = $1`, [app.rows[0].id]
    );
    await client.query('COMMIT');
    res.set('Cache-Control','private, no-store');
    res.json({ message: 'Replacement photo submitted for admin review.', photoReviewStatus: 'resubmitted' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally { client?.release(); }
}
