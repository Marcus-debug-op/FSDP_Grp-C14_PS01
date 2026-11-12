  -- Development branch only. Requires 005/008/009 membership application migrations.
  BEGIN;
  CREATE TABLE IF NOT EXISTS membership_reapplication_history (
  id BIGSERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id),
  prior_rejection_reason TEXT,
  reapply_note TEXT NOT NULL,
  reapply_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_membership_reapplication_history_application
  ON membership_reapplication_history(application_id, reapply_at DESC);

  CREATE TABLE IF NOT EXISTS hq_application_alerts (
  id BIGSERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('new_signup','reapplication')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by INTEGER REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_hq_application_alerts_open ON hq_application_alerts(created_at DESC)
  WHERE acknowledged_at IS NULL;

  -- A durable, admin-visible alert; not an email/SMS. Created in same DB transaction as signup.
  CREATE OR REPLACE FUNCTION create_hq_application_alert() RETURNS TRIGGER LANGUAGE plpgsql AS $$
  DECLARE notify_type VARCHAR(20);
  BEGIN
  IF TG_OP = 'INSERT' THEN
    notify_type := 'new_signup';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.approval_status = 'rejected' AND NEW.approval_status = 'pending') THEN
      RETURN NEW;
    END IF;
    notify_type := 'reapplication';
  END IF;
  IF EXISTS (
    SELECT 1 FROM centres c WHERE c.id = NEW.centre_id
    AND LOWER(c.name) = 'ask headquarters dojo'
  ) THEN
    INSERT INTO hq_application_alerts (application_id, event_type)
    VALUES (NEW.id, notify_type);
  END IF;
  RETURN NEW;
  END $$;
  DROP TRIGGER IF EXISTS trg_create_hq_application_alert ON membership_applications;
  CREATE TRIGGER trg_create_hq_application_alert
  AFTER INSERT OR UPDATE OF approval_status ON membership_applications
  FOR EACH ROW EXECUTE FUNCTION create_hq_application_alert();

  -- One initial alert for existing pending HQ applications, if no previous initial alert.
  INSERT INTO hq_application_alerts(application_id,event_type)
  SELECT a.id, 'new_signup' FROM membership_applications a
  JOIN centres c ON c.id = a.centre_id
  WHERE LOWER(c.name) = 'ask headquarters dojo'
  AND a.approval_status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM hq_application_alerts n
    WHERE n.application_id=a.id AND n.event_type='new_signup');
  COMMIT;
