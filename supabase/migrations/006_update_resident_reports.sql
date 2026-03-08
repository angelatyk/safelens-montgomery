-- Add new columns to resident_reports for creator tracking, anonymity, and full location details
ALTER TABLE resident_reports 
ADD COLUMN created_by uuid REFERENCES users(id),
ADD COLUMN is_anonymous boolean DEFAULT false,
ADD COLUMN address text;
