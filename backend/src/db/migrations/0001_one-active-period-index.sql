CREATE UNIQUE INDEX IF NOT EXISTS one_active_period ON periods ((status)) WHERE status = 'active';
