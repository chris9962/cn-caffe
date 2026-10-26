create index shifts_check_in_photo_path_idx on public.shifts (check_in_photo_path);
create index shifts_check_out_photo_path_idx on public.shifts (check_out_photo_path);
-- The audit_logs policy compares s.id::text = row_id, which the primary key index cannot serve.
create index shifts_id_text_idx on public.shifts ((id::text));
create index audit_logs_table_name_row_id_idx on public.audit_logs (table_name, row_id);

alter table public.shifts
  add constraint shifts_paid_status_has_check_out
    check (status not in ('valid', 'pending_review') or check_out_at is not null);
