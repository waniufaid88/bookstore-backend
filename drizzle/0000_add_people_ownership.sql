DO $$
DECLARE
  existing_users integer;
  existing_people integer;
BEGIN
  SELECT COUNT(*) INTO existing_users FROM users;
  SELECT (SELECT COUNT(*) FROM customers) + (SELECT COUNT(*) FROM suppliers)
    INTO existing_people;

  IF existing_people > 0 AND existing_users <> 1 THEN
    RAISE EXCEPTION 'Cannot safely assign existing customers and suppliers: expected exactly one user account, found %. Resolve ownership for existing people, then rerun this migration.', existing_users;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN user_id uuid;
--> statement-breakpoint
ALTER TABLE suppliers ADD COLUMN user_id uuid;
--> statement-breakpoint
UPDATE customers SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
--> statement-breakpoint
UPDATE suppliers SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
--> statement-breakpoint
ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE suppliers ALTER COLUMN user_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE customers ADD CONSTRAINT customers_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE suppliers ADD CONSTRAINT suppliers_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_unique;
--> statement-breakpoint
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_email_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX customers_user_email_unique ON customers(user_id, email);
--> statement-breakpoint
CREATE UNIQUE INDEX suppliers_user_email_unique ON suppliers(user_id, email);