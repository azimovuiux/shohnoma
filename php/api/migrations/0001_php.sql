CREATE TABLE IF NOT EXISTS `rate_hits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `k` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `rate_k_idx` (`k`, `created_at`)
);
