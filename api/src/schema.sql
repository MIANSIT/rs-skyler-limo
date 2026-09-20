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
  status            ENUM('new','quoted','confirmed','completed','cancelled','pending') NOT NULL DEFAULT 'new',
  trip_type         ENUM('airport','point-to-point','hourly') NOT NULL,

  -- How this trip is priced, decided at submission and never by the customer.
  --   `fixed` — an airport transfer inside New York City that matched a row in
  --             `airport_rates`. The fare was shown before booking and is owed.
  --   `quote` — everything else. No price until a person sets one.
  pricing_mode      ENUM('fixed','quote') NOT NULL DEFAULT 'quote',
  pickup            VARCHAR(255) NOT NULL,
  destination       VARCHAR(255) NOT NULL,
  pickup_at         DATETIME NOT NULL,
  passengers        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  bags              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  -- Requested child seats. Priced into `quoted_total_cents`, so the operator
  -- must be able to see why the fare is what it is.
  child_seats       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  vehicle_class     VARCHAR(60) NOT NULL,
  -- The occasion, as distinct from `trip_type` which is the shape of the
  -- journey. An airport run can be corporate or personal and they are handled
  -- by different people, so the booker is asked rather than guessed at.
  service_type      ENUM('personal','corporate','wedding','event','other')
                      NOT NULL DEFAULT 'personal',
  airline           VARCHAR(120) NULL,
  flight_number     VARCHAR(20) NULL,
  customer_name     VARCHAR(160) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  customer_phone    VARCHAR(40) NOT NULL,
  notes             TEXT NULL,
  -- Money in cents. Never a float. Set at submission for `fixed`, and by an
  -- operator for `quote` — NULL means nobody has priced it yet.
  quoted_total_cents INT UNSIGNED NULL,
  quoted_at         DATETIME NULL,
  quoted_by         BIGINT UNSIGNED NULL,
  -- What the operator wants the customer to read beside the number.
  quote_note        TEXT NULL,

  -- Resolved from the address by the Places lookup, so "is this inside New
  -- York" is answered by Google rather than by trusting typed text. NULL when
  -- the lookup was unavailable and the customer typed a plain address.
  pickup_place_id        VARCHAR(255) NULL,
  pickup_locality        VARCHAR(120) NULL,
  pickup_region          VARCHAR(60) NULL,
  destination_place_id   VARCHAR(255) NULL,
  destination_locality   VARCHAR(120) NULL,
  destination_region     VARCHAR(60) NULL,

  -- Which airport, on an airport transfer, and which way it runs.
  airport_code      VARCHAR(8) NULL,
  airport_direction ENUM('from-airport','to-airport') NULL,

  source            VARCHAR(40) NOT NULL DEFAULT 'website',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_reference (reference),
  KEY ix_bookings_status_pickup (status, pickup_at),
  KEY ix_bookings_created (created_at),
  KEY ix_bookings_email (customer_email),
  -- /track matches on both, so the index carries both.
  KEY ix_bookings_reference_phone (reference, customer_phone),
  KEY ix_bookings_pricing (pricing_mode, status),
  CONSTRAINT fk_bookings_quoted_by
    FOREIGN KEY (quoted_by) REFERENCES admin_users (id) ON DELETE SET NULL
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

-- The fleet, as the operator maintains it. The public /fleet page and the
-- booking form's vehicle list both read from here, so a class that is not in
-- this table cannot be advertised or booked — which is the requirement doc's
-- "only show vehicles actually available" enforced by construction rather than
-- by remembering.
CREATE TABLE IF NOT EXISTS vehicles (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Used in URLs and stored on bookings, so it must stay stable once live.
  slug               VARCHAR(60) NOT NULL,
  name               VARCHAR(120) NOT NULL,
  -- The class families from §49 of the requirements.
  category           ENUM('sedan','suv','premium-suv','van','sprinter') NOT NULL,
  -- Free text: "Cadillac XTS or similar". Kept separate from `name` so the
  -- card can say "Luxury Sedan" while being honest about the actual car.
  model              VARCHAR(160) NULL,

  passenger_capacity TINYINT UNSIGNED NOT NULL,
  luggage_capacity   TINYINT UNSIGNED NOT NULL,
  -- How many child seats this class can physically take. 0 means none; the
  -- booking form caps its add-on selector at this number.
  max_child_seats    TINYINT UNSIGNED NOT NULL DEFAULT 0,

  -- Money in cents, never a float. The "from" price shown on the fleet page.
  base_fare_cents    INT UNSIGNED NOT NULL,

  -- One sentence for the card, one paragraph for the detail.
  best_for           VARCHAR(500) NOT NULL,
  detail             TEXT NOT NULL,

  -- Amenity keys from the canonical list in `src/vehicles/amenities.ts`, as a
  -- JSON array. A lookup table would be the textbook answer; this list is
  -- fixed, short, and never queried by amenity, so a joined table would buy
  -- nothing and cost two more round trips per page.
  amenities          JSON NOT NULL,

  -- Hidden vehicles keep their bookings and their history but leave the public
  -- site immediately — the honest way to retire a car mid-season.
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  display_order      SMALLINT UNSIGNED NOT NULL DEFAULT 0,

  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicles_slug (slug),
  KEY ix_vehicles_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploaded photography. Exterior and interior are distinguished because §15
-- asks for both, and the card shows one exterior while the detail view shows
-- the rest.
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id    BIGINT UNSIGNED NOT NULL,
  -- Path relative to the uploads root, never an absolute URL: the host changes
  -- between staging and production, the file does not.
  file_path     VARCHAR(255) NOT NULL,
  kind          ENUM('exterior','interior') NOT NULL DEFAULT 'exterior',
  -- Required, not optional: §38 asks for alt text on every image, and an empty
  -- column is how that silently stops happening.
  alt_text      VARCHAR(255) NOT NULL,
  width         SMALLINT UNSIGNED NULL,
  height        SMALLINT UNSIGNED NULL,
  byte_size     INT UNSIGNED NULL,
  /** Exactly one photo per vehicle should be primary; enforced in the service. */
  is_primary    TINYINT(1) NOT NULL DEFAULT 0,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_vehicle_photos_vehicle (vehicle_id, display_order),
  CONSTRAINT fk_vehicle_photos_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The homepage hero's background media, managed from the dashboard. Page-level
-- rather than per-vehicle, so no foreign key to `vehicles`.
CREATE TABLE IF NOT EXISTS hero_media (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind          ENUM('image','video') NOT NULL DEFAULT 'image',
  file_path     VARCHAR(255) NOT NULL,
  -- Still frame for a video, shown before/while it loads. NULL for images.
  poster_path   VARCHAR(255) NULL,
  alt_text      VARCHAR(255) NOT NULL,
  width         SMALLINT UNSIGNED NULL,
  height        SMALLINT UNSIGNED NULL,
  byte_size     INT UNSIGNED NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_hero_media_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The airports a customer can book a transfer to or from. Managed in the
-- dashboard. `code` is the operator-facing key and never changes after creation:
-- rates and past bookings refer to it. Inactive airports leave the booking form
-- but keep their rates, so switching one back on restores its prices.
CREATE TABLE IF NOT EXISTS airports (
  code          VARCHAR(8) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY ix_airports_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The starting list, inserted only into an empty table. Once the operator has
-- any airport of their own, a re-run of migrate never brings a deleted one back.
INSERT IGNORE INTO airports (code, name, display_order)
SELECT * FROM (
  SELECT 'JFK' AS code, 'JFK International' AS name, 1 AS display_order
  UNION ALL SELECT 'LGA', 'LaGuardia (LGA)', 2
  UNION ALL SELECT 'EWR', 'Newark Liberty (EWR)', 3
  UNION ALL SELECT 'TEB', 'Teterboro (TEB)', 4
  UNION ALL SELECT 'HPN', 'Westchester County (HPN)', 5
) AS defaults
WHERE NOT EXISTS (SELECT 1 FROM airports);

-- The fixed-price card for airport transfers inside New York City.
--
-- One price per airport per vehicle class, covering all five boroughs. A row
-- that is missing or inactive is not an error: it means that combination has no
-- published fare and the request falls through to a quote, which is the safe
-- direction to fail.
CREATE TABLE IF NOT EXISTS airport_rates (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  airport_code  VARCHAR(8) NOT NULL,
  vehicle_id    BIGINT UNSIGNED NOT NULL,
  price_cents   INT UNSIGNED NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  updated_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_airport_rates (airport_code, vehicle_id),
  KEY ix_airport_rates_active (is_active),
  CONSTRAINT fk_airport_rates_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE,
  CONSTRAINT fk_airport_rates_admin
    FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Who changed what. The dashboard holds customer names, phone numbers and home
-- addresses; every status change is attributable.
CREATE TABLE IF NOT EXISTS activity_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_type   ENUM('booking','quote','vehicle') NOT NULL,
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

-- Customer reviews, left on the website after a trip is completed.
--
-- One per booking (the unique key), and only for a booking whose status is
-- completed; the API enforces that, not the schema. A review starts pending and
-- reaches the public site only once an operator approves it, so abuse and spam
-- never appear. Hiding is reversible; the row is kept.
CREATE TABLE IF NOT EXISTS reviews (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id    BIGINT UNSIGNED NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  comment       TEXT NOT NULL,
  display_name  VARCHAR(80) NOT NULL,
  status        ENUM('pending','approved','hidden') NOT NULL DEFAULT 'pending',
  moderated_by  BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_booking (booking_id),
  KEY ix_reviews_status_created (status, created_at),
  CONSTRAINT fk_reviews_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_admin
    FOREIGN KEY (moderated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
