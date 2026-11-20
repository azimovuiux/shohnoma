-- Rahmat (pay.sunicode.uz) to‘lov usuli uchun payments.provider qiymati
ALTER TABLE `payments` MODIFY `provider` enum('payme','click','google_pay','p2p','rahmat') NOT NULL;
