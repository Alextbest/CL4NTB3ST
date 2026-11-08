-- Replace legacy availability choices with the new clan statuses.
ALTER TABLE public.member_presence DROP CONSTRAINT IF EXISTS member_presence_status_check;
UPDATE public.member_presence SET status = CASE WHEN status = 'busy' THEN 'do_not_disturb' WHEN status = 'looking_for_squad' THEN 'invite_me' WHEN status IN ('available','do_not_disturb','invite_me') THEN status ELSE 'available' END;
ALTER TABLE public.member_presence ALTER COLUMN status SET DEFAULT 'available', ADD CONSTRAINT member_presence_status_check CHECK (status IN ('do_not_disturb','available','invite_me'));
