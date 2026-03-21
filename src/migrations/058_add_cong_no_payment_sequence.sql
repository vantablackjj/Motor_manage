-- Migration 058: Thêm sequence để sinh số phiếu thanh toán công nợ duy nhất
-- Mục đích: Thay thế Date.now() (không an toàn khi Cluster mode) bằng PostgreSQL sequence

-- Sequence cho số phiếu thanh toán công nợ (nội bộ và đối tác)
CREATE SEQUENCE IF NOT EXISTS seq_cong_no_payment
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Thêm comment để dễ tra cứu
COMMENT ON SEQUENCE seq_cong_no_payment IS 'Sequence sinh số phiếu thanh toán công nợ (PT/PC + YYYYMMDD + 6 digits)';
