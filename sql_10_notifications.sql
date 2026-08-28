-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,  -- order_status, support_reply, promo, system
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,            -- optional URL to navigate to
  icon TEXT,            -- material symbol name
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_email, created_at DESC) WHERE read_at IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_email, created_at DESC) WHERE deleted_at IS NULL;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Auto-create notifications on order status change
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  notif_title TEXT;
  notif_body TEXT;
  notif_link TEXT;
BEGIN
  -- Only on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    user_email := NEW.email;
    notif_title := 'Order ' || NEW.id || ' ' || NEW.status;
    notif_body := 'Your order is now ' || NEW.status;
    notif_link := '/#/orders';
    INSERT INTO notifications (user_email, type, title, body, link, icon)
    VALUES (user_email, 'order_status', notif_title, notif_body, notif_link,
      CASE NEW.status
        WHEN 'shipped' THEN 'local_shipping'
        WHEN 'delivered' THEN 'check_circle'
        WHEN 'cancelled' THEN 'cancel'
        ELSE 'package_2'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_order_status ON orders;
CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();

-- Auto-create notification on new support message from admin
CREATE OR REPLACE FUNCTION notify_support_message()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  notif_title TEXT;
  notif_body TEXT;
  notif_link TEXT;
BEGIN
  -- Only when admin sends to a user
  IF NEW.sender_type = 'admin' THEN
    SELECT user_email INTO user_email FROM support_chats WHERE id = NEW.chat_id;
    IF user_email IS NOT NULL THEN
      notif_title := 'New message from support';
      notif_body := COALESCE(NEW.message, '');
      notif_link := '/#/support';
      INSERT INTO notifications (user_email, type, title, body, link, icon)
      VALUES (user_email, 'support_reply', notif_title, notif_body, notif_link, 'support_agent');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_support_message ON support_messages;
CREATE TRIGGER trg_notify_support_message
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION notify_support_message();

INSERT INTO schema_migrations (version, name) VALUES
  (10, 'sql_10_notifications - notifications table + triggers')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
