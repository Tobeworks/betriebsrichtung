CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(200) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `external_forecast` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `source` VARCHAR(32) NOT NULL,
  `fetched_at` DATETIME(3) NOT NULL,
  `window_start` DATETIME(3) NOT NULL,
  `window_end` DATETIME(3) NOT NULL,
  `statement` VARCHAR(12) NOT NULL,
  `direction` VARCHAR(4) NULL,
  `probability` DECIMAL(5,4) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_external_forecast_window` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forecast_config_version` (
  `id` INT UNSIGNED AUTO_INCREMENT NOT NULL,
  `config_hash` CHAR(64) NOT NULL,
  `version` INT UNSIGNED NOT NULL,
  `content` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `change_note` VARCHAR(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_forecast_config_hash` (`config_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forecast_evaluation` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `lead_class` VARCHAR(16) NOT NULL,
  `lead_day` TINYINT UNSIGNED NOT NULL,
  `window_kind` VARCHAR(10) NOT NULL,
  `period` VARCHAR(16) NOT NULL,
  `config_hash` CHAR(64) NOT NULL,
  `comparisons` INT UNSIGNED NOT NULL,
  `hit_rate` DECIMAL(5,4) NULL,
  `brier` DECIMAL(5,4) NULL,
  `skill_west` DOUBLE NULL,
  `skill_climatology` DOUBLE NULL,
  `skill_persistence` DOUBLE NULL,
  `ci_low` DECIMAL(5,4) NULL,
  `ci_high` DECIMAL(5,4) NULL,
  `reliability` JSON NOT NULL,
  `provisional` BOOLEAN NOT NULL,
  `computed_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_forecast_evaluation` (`computed_at`, `window_kind`, `period`, `config_hash`, `lead_class`, `lead_day`),
  KEY `idx_forecast_evaluation_scope` (`window_kind`, `period`, `config_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forecast_run` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `run_date` DATE NOT NULL,
  `run_seq` TINYINT UNSIGNED NOT NULL,
  `config_hash` CHAR(64) NOT NULL,
  `computed_at` DATETIME(3) NOT NULL,
  `status` VARCHAR(10) NOT NULL,
  `duration_ms` INT UNSIGNED NOT NULL,
  `models` JSON NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_forecast_run_slot` (`run_date`, `run_seq`),
  KEY `idx_forecast_run_computed_at` (`computed_at`),
  CONSTRAINT `fk_forecast_run_config` FOREIGN KEY (`config_hash`) REFERENCES forecast_config_version(config_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_run` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `job_name` VARCHAR(40) NOT NULL,
  `started_at` DATETIME(3) NOT NULL,
  `finished_at` DATETIME(3) NULL,
  `status` VARCHAR(10) NOT NULL,
  `rows_read` INT UNSIGNED NOT NULL,
  `rows_written` INT UNSIGNED NOT NULL,
  `error_text` TEXT NULL,
  `job_version` VARCHAR(200) NOT NULL,
  `correlation_id` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_job_run_correlation` (`correlation_id`),
  KEY `idx_job_run_name_started` (`job_name`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `observation` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `observed_at` DATETIME(3) NOT NULL,
  `runway_direction` VARCHAR(4) NOT NULL,
  `source` VARCHAR(32) NOT NULL,
  `recorded_at` DATETIME(3) NOT NULL,
  `detail` VARCHAR(200) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_observation` (`observed_at`, `source`),
  KEY `idx_observation_observed_at` (`observed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slot_actual` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `local_date` DATE NOT NULL,
  `slot` VARCHAR(10) NOT NULL,
  `window_start` DATETIME(3) NOT NULL,
  `window_end` DATETIME(3) NOT NULL,
  `east_share` DECIMAL(5,4) NOT NULL,
  `observed_share` DECIMAL(5,4) NOT NULL,
  `truth` VARCHAR(4) NOT NULL,
  `source` VARCHAR(32) NULL,
  `quality` VARCHAR(10) NOT NULL,
  `computed_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slot_actual` (`local_date`, `slot`),
  KEY `idx_slot_actual_window` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `source_heartbeat` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `source` VARCHAR(32) NOT NULL,
  `checked_at` DATETIME(3) NOT NULL,
  `status` VARCHAR(10) NOT NULL,
  `detail` VARCHAR(200) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_source_heartbeat` (`source`, `checked_at`),
  KEY `idx_heartbeat_source_checked` (`source`, `checked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wind_aggregate` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `run_id` BIGINT UNSIGNED NOT NULL,
  `window_start` DATETIME(3) NOT NULL,
  `model` VARCHAR(40) NOT NULL,
  `east_member_share` DECIMAL(5,4) NOT NULL,
  `mean_direction_deg` DOUBLE NOT NULL,
  `mean_speed_kn` DOUBLE NOT NULL,
  `resultant_length` DECIMAL(5,4) NOT NULL,
  `speed_sd` DOUBLE NOT NULL,
  `tailwind_p10` DOUBLE NOT NULL,
  `tailwind_p50` DOUBLE NOT NULL,
  `tailwind_p90` DOUBLE NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wind_aggregate_run_window_model` (`run_id`, `window_start`, `model`),
  CONSTRAINT `fk_wind_aggregate_run` FOREIGN KEY (`run_id`) REFERENCES forecast_run(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wind_observation` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `observed_at` DATETIME(3) NOT NULL,
  `speed_kn` DOUBLE NOT NULL,
  `direction_deg` DOUBLE NULL,
  `source` VARCHAR(32) NOT NULL,
  `recorded_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wind_observation` (`observed_at`, `source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `forecast` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `run_id` BIGINT UNSIGNED NOT NULL,
  `window_start` DATETIME(3) NOT NULL,
  `window_end` DATETIME(3) NOT NULL,
  `local_date` DATE NOT NULL,
  `slot` VARCHAR(10) NOT NULL,
  `model` VARCHAR(40) NOT NULL,
  `p_east_raw` DECIMAL(5,4) NOT NULL,
  `p_east` DECIMAL(5,4) NOT NULL,
  `calibrated` BOOLEAN NOT NULL,
  `expected_east_share` DECIMAL(5,4) NOT NULL,
  `members` SMALLINT UNSIGNED NOT NULL,
  `lead_hours` DOUBLE NOT NULL,
  `config_hash` CHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_forecast_run_window_model` (`run_id`, `window_start`, `model`),
  KEY `idx_forecast_window_model` (`window_start`, `model`),
  CONSTRAINT `fk_forecast_run` FOREIGN KEY (`run_id`) REFERENCES forecast_run(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
