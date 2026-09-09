-- RSSkyler Limo — operational schema.
--
-- One database, five tables. Bookings and quotes are kept apart because they
-- are different objects to the business: a booking has a pickup time and a
-- vehicle, a quote is a conversation that has not become a trip yet.
--
-- Statements are idempotent so `npm run migrate` is safe to re-run.

CREATE TABLE IF NOT EXISTS admin_users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email          VARCHAR(255) NOT NULL,
  name           VARCHAR(120) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('owner','dispatcher') NOT NULL DEFAULT 'dispatcher',
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at  DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions live in the database rather than in a signed token so an operator's
-- access can be revoked the moment they leave. Only the SHA-256 of the token is
-- stored; a database dump does not hand over live sessions.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id  BIGINT UNSIGNED NOT NULL,
  token_hash     CHAR(64) NOT NULL,
  expires_at     DATETIME NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent     VARCHAR(255) NULL,
  ip_address     VARCHAR(45) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_sessions_token (token_hash),
  KEY ix_admin_sessions_user (admin_user_id),
  KEY ix_admin_sessions_expiry (expires_at),
  CONSTRAINT fk_admin_sessions_user
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Customer-facing identifier. This is what the operator reads down the phone
  -- and what /track accepts, so it never exposes a sequential row id.
  reference         CHAR(10) NOT NULL,
  status            ENUM('new','confirmed','completed','cancelled','pending') NOT NULL DEFAULT 'new',
  trip_type         ENUM('airport','point-to-point','hourly') NOT NULL,
  pickup            VARCHAR(255) NOT NULL,
  destination       VARCHAR(255) NOT NULL,
  pickup_at         DATETIME NOT NULL,
  passengers        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  bags              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  vehicle_class     VARCHAR(60) NOT NULL,
  airline           VARCHAR(120) NULL,
  flight_number     VARCHAR(20) NULL,
  customer_name     VARCHAR(160) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  customer_phone    VARCHAR(40) NOT NULL,
  notes             TEXT NULL,
  -- Money in cents. Never a float.
  quoted_total_cents INT UNSIGNED NULL,
  source            VARCHAR(40) NOT NULL DEFAULT 'website',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_reference (reference),
  KEY ix_bookings_status_pickup (status, pickup_at),
  KEY ix_bookings_created (created_at),
  KEY ix_bookings_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotes (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference         CHAR(10) NOT NULL,
  status            ENUM('new','quoted','won','lost','pending') NOT NULL DEFAULT 'new',
  service_type      ENUM('corporate','wedding','event','hourly','other') NOT NULL,
  event_date        DATE NULL,
  passengers        SMALLINT UNSIGNED NULL,
  company           VARCHAR(160) NULL,
  customer_name     VARCHAR(160) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  customer_phone    VARCHAR(40) NOT NULL,
  details           TEXT NOT NULL,
  source            VARCHAR(40) NOT NULL DEFAULT 'website',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotes_reference (reference),
  KEY ix_quotes_status_created (status, created_at),
  KEY ix_quotes_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Who changed what. The dashboard holds customer names, phone numbers and home
-- addresses; every status change is attributable.
CREATE TABLE IF NOT EXISTS activity_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_type   ENUM('booking','quote') NOT NULL,
  subject_id     BIGINT UNSIGNED NOT NULL,
  admin_user_id  BIGINT UNSIGNED NULL,
  action         VARCHAR(40) NOT NULL,
  from_status    VARCHAR(20) NULL,
  to_status      VARCHAR(20) NULL,
  note           TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_activity_subject (subject_type, subject_id, created_at),
  CONSTRAINT fk_activity_admin_user
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
